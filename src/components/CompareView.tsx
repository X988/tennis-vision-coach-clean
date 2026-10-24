import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Court } from './Court';
import { Player } from './Player';
import { Ball } from './Ball';
import { AnimationEngine } from '../engines/AnimationEngine';
import { BallEngine } from '../engines/BallEngine';
import * as THREE from 'three';

export function CompareView({ studentScenario, recommendedScenario }: {
  studentScenario: any;
  recommendedScenario: any;
}) {
  const ballS = new BallEngine({
    bouncePoint: studentScenario.bounce || { x: 0, z: -9 },
    speed: studentScenario.speed || 15,
    spin: studentScenario.spin || 'flat',
    bounceHeight: studentScenario.height || 0.6
  });
  const ballR = new BallEngine({
    bouncePoint: recommendedScenario.bounce || { x: 0, z: -9 },
    speed: recommendedScenario.speed || 15,
    spin: recommendedScenario.spin || 'flat',
    bounceHeight: recommendedScenario.height || 0.6
  });
  const animS = new AnimationEngine();
  const animR = new AnimationEngine();
  animS.setContactTime(ballS.getContactTime());
  animR.setContactTime(ballR.getContactTime());

  const pos = new THREE.Vector3(0, 0, -10);

  return (
    <div style={{ display: 'flex', gap: 8, height: 360 }}>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontSize: 13 }}>Ученик</div>
        <Canvas>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} />
          <OrbitControls />
          <Court />
          <Ball engine={ballS} simTime={1.2} />
          <Player pos={pos} stance={studentScenario.stance || 'neutral'} shot="forehand" handed="right" anim={animS} simTime={1.2} />
        </Canvas>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontSize: 13 }}>Рекомендовано</div>
        <Canvas>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} />
          <OrbitControls />
          <Court />
          <Ball engine={ballR} simTime={1.2} />
          <Player pos={pos} stance={recommendedScenario.stance || 'semi-open'} shot="forehand" handed="right" anim={animR} simTime={1.2} />
        </Canvas>
      </div>
    </div>
  );
}
