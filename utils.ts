
import { Target, TargetType, ThreatPriority, SimulationStatus, Vector2D, Authenticity } from './types';

export const calculateDistance = (p1: Vector2D, p2: Vector2D): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const HOME_BASE: Vector2D = { x: 500, y: 500 };

export const getPriority = (score: number): ThreatPriority => {
  if (score > 80) return ThreatPriority.CRITICAL;
  if (score > 60) return ThreatPriority.HIGH;
  if (score > 30) return ThreatPriority.MEDIUM;
  return ThreatPriority.LOW;
};

export const calculateThreatScore = (target: Partial<Target>): number => {
  let score = 0;
  
  const dist = calculateDistance(target.position!, HOME_BASE);
  const distFactor = Math.max(0, (1000 - dist) / 10);
  score += distFactor * 0.4;

  const speedFactor = Math.min(100, target.speed! / 10);
  score += speedFactor * 0.2;

  const typeWeights: Record<TargetType, number> = {
    [TargetType.MISSILE]: 100,
    [TargetType.DRONE]: 60,
    [TargetType.UNKNOWN]: 40,
    [TargetType.DECOY]: 10,
  };
  score += typeWeights[target.type!] * 0.3;
  score += (target.confidence! * 100) * 0.1;

  // AI Decoy Mitigation logic: Reduce score significantly if it's likely a decoy
  if (target.decoyProbability) {
    const mitigationFactor = 1 - (target.decoyProbability * 0.9);
    score *= mitigationFactor;
  }

  return Math.min(100, score);
};

export const predictImpact = (pos: Vector2D, vel: Vector2D, time: number): Vector2D => {
  return {
    x: pos.x + vel.x * time,
    y: pos.y + vel.y * time
  };
};

export const generateId = () => `TGT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

export const createMockTarget = (): Target => {
  const angle = Math.random() * Math.PI * 2;
  const dist = 800 + Math.random() * 200;
  const x = HOME_BASE.x + Math.cos(angle) * dist;
  const y = HOME_BASE.y + Math.sin(angle) * dist;
  
  const speed = 200 + Math.random() * 1200;
  const vx = -Math.cos(angle) * (speed / 10);
  const vy = -Math.sin(angle) * (speed / 10);

  const types = Object.values(TargetType);
  const type = types[Math.floor(Math.random() * types.length)];

  // AI Decoy Detection Logic (Simulated)
  let decoyProbability = Math.random() < 0.2 ? 0.6 + Math.random() * 0.4 : Math.random() * 0.3;
  let authenticity = Authenticity.GENUINE;
  let decoyReason = "Radar signature matches profile";

  // Anomaly: Speed check
  if (type === TargetType.MISSILE && speed < 300) {
    decoyProbability += 0.4;
    decoyReason = "Velocity anomaly (Too slow for ballistic profile)";
  }
  
  // Anomaly: Altitude/Signature mismatch
  if (Math.random() < 0.15) {
    decoyProbability = 0.85;
    decoyReason = "Sensor signature mismatch (Reflective pattern inconsistent)";
  }

  if (decoyProbability > 0.8) authenticity = Authenticity.FALSE_RETURN;
  else if (decoyProbability > 0.5) authenticity = Authenticity.POSSIBLE_DECOY;

  const initialTarget: Partial<Target> = {
    id: generateId(),
    type,
    position: { x, y },
    velocity: { x: vx, y: vy },
    altitude: 2000 + Math.random() * 20000,
    speed,
    heading: (angle * 180 / Math.PI + 180) % 360,
    status: SimulationStatus.DETECTED,
    confidence: 0.7 + Math.random() * 0.29,
    history: [],
    humanVerified: false,
    impactEta: dist / (speed / 10),
    decoyProbability: Math.min(1, decoyProbability),
    authenticity,
    decoyReason
  };

  const finalTarget = initialTarget as Target;
  finalTarget.threatScore = calculateThreatScore(finalTarget);
  finalTarget.priority = getPriority(finalTarget.threatScore);
  finalTarget.predictedImpact = predictImpact(finalTarget.position, finalTarget.velocity, finalTarget.impactEta);
  finalTarget.recommendedAction = finalTarget.threatScore > 50 ? 'Engage Interceptor' : 'Monitor Trajectory';

  return finalTarget;
};

export const playAlertSound = (severity: 'critical' | 'normal' = 'normal') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (severity === 'critical') {
      // Urgent dual-tone alert
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } else {
      // Subtle tactical ping
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    // Silently fail if browser blocks audio
  }
};
