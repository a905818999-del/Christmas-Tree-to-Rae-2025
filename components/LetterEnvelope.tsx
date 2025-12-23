
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionMode } from '../types';

interface LetterEnvelopeProps {
  mode: InteractionMode;
  content: string;
  isFocused: boolean;
  onClick: () => void;
}

const LetterEnvelope: React.FC<LetterEnvelopeProps> = ({ mode, content, isFocused, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const flapRef = useRef<THREE.Group>(null);
  const letterRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 1. 奢华手写纹理 (包含织梦行云字体、自动换行、角落点缀)
  const letterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; 
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
      const words = text.split('');
      const lines = [];
      let currentLine = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n];
        if (context.measureText(testLine).width > maxWidth && n > 0) {
          lines.push(currentLine);
          currentLine = words[n];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const updateTexture = (text: string) => {
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, 2048, 1400);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 20;
      ctx.strokeRect(60, 60, 1928, 1280);
      ctx.lineWidth = 5;
      ctx.strokeRect(100, 100, 1848, 1200);

      // 🎄 圣诞树与 ❄ 雪花点缀 (金色半透明)
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = '#d4af37';
      ctx.shadowBlur = 20;
      ctx.font = '140px serif';
      ctx.fillStyle = '#d4af37';
      ctx.fillText('🎄', 180, 230);
      ctx.fillText('❄', 1780, 1200);
      ctx.restore();

      ctx.fillStyle = '#fceabb'; 
      ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
      ctx.shadowBlur = 12;
      
      const maxWidth = 1500;
      const rawLines = text.split('\n');
      const startX = 280;
      let currentY = 320;
      
      const finalLines: { text: string; isHeader?: boolean; isFooter?: boolean }[] = [];
      rawLines.forEach((line, i) => {
        if (i === 0) finalLines.push({ text: line, isHeader: true });
        else if (i === rawLines.length - 1 && line.length < 15) finalLines.push({ text: line, isFooter: true });
        else {
          ctx.font = '85px "Zhi Mang Xing"';
          wrapText(ctx, line, maxWidth).forEach(l => finalLines.push({ text: l }));
        }
      });

      const availableHeight = 1000;
      const baseLineHeight = Math.min(130, availableHeight / Math.max(8, finalLines.length));
      const baseFontSize = Math.min(85, (availableHeight / Math.max(8, finalLines.length)) * 0.85);

      finalLines.forEach((lineObj, i) => {
        const line = lineObj.text;
        if (line.trim() === '') { currentY += baseLineHeight * 0.5; return; }
        ctx.save();
        const rotation = (Math.random() - 0.5) * 0.04;
        const offsetX = (Math.random() - 0.5) * 20;
        ctx.translate(startX + offsetX, currentY);
        ctx.rotate(rotation);

        if (lineObj.isHeader) {
          ctx.font = `bold ${Math.min(120, baseFontSize * 1.4)}px "Zhi Mang Xing"`;
          ctx.fillText(line, -20, 0);
          currentY += baseLineHeight * 1.6;
        } else if (lineObj.isFooter) {
          ctx.font = `bold ${Math.min(100, baseFontSize * 1.2)}px "Zhi Mang Xing"`;
          ctx.textAlign = 'right';
          ctx.fillText(line, 1500, 50);
        } else {
          ctx.font = `${baseFontSize}px "Zhi Mang Xing"`;
          ctx.letterSpacing = (Math.random() * 4).toString() + 'px';
          ctx.fillText(line, 0, 0);
          currentY += baseLineHeight;
        }
        ctx.restore();
      });

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(300, 1250); ctx.lineTo(1748, 1250); ctx.stroke();
    };

    updateTexture(content);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    (texture as any).refresh = updateTexture;
    return texture;
  }, []);

  useEffect(() => {
    document.fonts.ready.then(() => {
        if ((letterTexture as any).refresh) {
            (letterTexture as any).refresh(content);
            letterTexture.needsUpdate = true;
        }
    });
  }, [content, letterTexture]);

  const ENV_W = 3.4;
  const ENV_H = 2.4;

  const flapGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-ENV_W / 2, 0); shape.lineTo(ENV_W / 2, 0); shape.lineTo(0, -ENV_H * 0.75); shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
  }, []);

  const treeData = useMemo(() => {
    const treeH = 4.2;
    const treeAngle = Math.PI * 0.78;
    const treeR = 4.6;
    const pos = new THREE.Vector3(Math.cos(treeAngle) * treeR, treeH, Math.sin(treeAngle) * treeR);
    const d = new THREE.Object3D();
    d.position.copy(pos); d.lookAt(0, treeH, 0); d.rotateY(Math.PI); d.rotateZ(0.2); 
    return { pos, rot: d.quaternion.clone() };
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !flapRef.current || !letterRef.current) return;

    const time = state.clock.elapsedTime;
    let targetPos = new THREE.Vector3();
    let targetRot = new THREE.Quaternion();
    let flapAngle = 0;
    let letterY = 0;
    let letterZ = 0.04;
    let targetScale = 0.7;

    if (isFocused) {
      // --- 关键优化：显著增加垂直偏移量 ---
      const cam = state.camera;
      const camPos = cam.position.clone();
      const camDir = new THREE.Vector3();
      cam.getWorldDirection(camDir);
      
      // 观察距离微调至 9.2
      const worldPoint = camPos.add(camDir.multiplyScalar(9.2));
      
      // 相机本地下移量大幅增加：从 2.2 增加到 5.2
      // 这样可以将信封完全推到 Merry Christmas 标题之下
      const downVector = new THREE.Vector3(0, -1, 0).applyQuaternion(cam.quaternion);
      worldPoint.add(downVector.multiplyScalar(5.2));
      
      // 补偿父级 group 的偏移
      targetPos.copy(worldPoint);
      targetPos.y += 2.0; 
      
      // 保持正对相机
      targetRot.copy(cam.quaternion);
      
      flapAngle = -Math.PI * 0.98; 
      letterY = ENV_H * 0.85;      
      letterZ = 0.6;               
      targetScale = 2.1; 
    } else {
      if (mode === InteractionMode.UNLEASHED) {
        targetPos.set(8, 7, 5);
        targetPos.y += Math.sin(time * 0.5) * 1.5;
        dummy.position.copy(targetPos);
        dummy.lookAt(state.camera.position);
        targetRot.copy(dummy.quaternion);
      } else {
        targetPos.copy(treeData.pos);
        targetRot.copy(treeData.rot);
        targetPos.y += Math.sin(time * 1.2) * 0.15;
      }
    }

    // 插值系数
    groupRef.current.position.lerp(targetPos, 0.12);
    groupRef.current.quaternion.slerp(targetRot, 0.12);
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    
    flapRef.current.rotation.x = THREE.MathUtils.lerp(flapRef.current.rotation.x, flapAngle, 0.1);
    letterRef.current.position.y = THREE.MathUtils.lerp(letterRef.current.position.y, letterY, 0.1);
    letterRef.current.position.z = THREE.MathUtils.lerp(letterRef.current.position.z, letterZ, 0.1);
  });

  return (
    <group 
        ref={groupRef} 
        onClick={(e) => { e.stopPropagation(); onClick(); }} 
        onPointerOver={() => (document.body.style.cursor = 'pointer')} 
        onPointerOut={() => (document.body.style.cursor = 'auto')}
        renderOrder={isFocused ? 1000 : 50}
    >
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[ENV_W, ENV_H, 0.1]} />
        <meshPhysicalMaterial color="#1a1a1a" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh ref={letterRef}>
        <planeGeometry args={[ENV_W * 0.95, ENV_H * 0.95]} />
        <meshStandardMaterial map={letterTexture} roughness={0.5} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, -ENV_H * 0.15, 0.08]}>
        <planeGeometry args={[ENV_W, ENV_H * 0.7]} />
        <meshPhysicalMaterial color="#222" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, ENV_H * 0.2, 0.09]} scale={[ENV_W, 0.05, 1]}>
        <boxGeometry args={[1, 1, 0.02]} />
        <meshPhysicalMaterial color="#d4af37" metalness={1.0} roughness={0.15} clearcoat={1.0} />
      </mesh>
      <group ref={flapRef} position={[0, ENV_H / 2, 0.1]}>
        <mesh geometry={flapGeometry} position={[0, 0, 0.01]}>
          <meshPhysicalMaterial color="#d4af37" metalness={1.0} roughness={0.15} clearcoat={1.0} />
        </mesh>
      </group>
      <group position={[0, -0.1, 0.18]} visible={!isFocused}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
          <meshStandardMaterial color="#6b0000" />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
           <sphereGeometry args={[0.15, 16, 16]} scale={[1, 1, 0.2]} />
           <meshStandardMaterial color="#400000" />
        </mesh>
      </group>
      <pointLight visible={isFocused} intensity={35} distance={20} color="#fffbe3" position={[0, 2, 5]} />
    </group>
  );
};

export default LetterEnvelope;
