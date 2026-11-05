
export enum TargetType {
  MISSILE = 'Ballistic Missile',
  DRONE = 'UAV / Drone',
  DECOY = 'Decoy / Flare',
  UNKNOWN = 'Unidentified'
}

export enum Authenticity {
  GENUINE = 'Genuine Threat',
  POSSIBLE_DECOY = 'Possible Decoy',
  FALSE_RETURN = 'Likely False Return'
}

export enum ThreatPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum SimulationStatus {
  DETECTED = 'Detected',
  TRACKING = 'Tracking',
  ANALYZING = 'Analyzing',
  LOCKED = 'Target Locked',
  INTERCEPTED = 'Intercepted',
  MISSED = 'Missed',
  DISMISSED = 'Dismissed'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Target {
  id: string;
  type: TargetType;
  position: Vector2D;
  velocity: Vector2D;
  altitude: number; // in meters
  speed: number;    // in m/s
  heading: number;  // degrees
  threatScore: number; // 0-100
  priority: ThreatPriority;
  status: SimulationStatus;
  confidence: number; // 0-1
  impactEta: number;  // seconds
  predictedImpact: Vector2D;
  recommendedAction: string;
  history: Vector2D[];
  humanVerified: boolean;
  humanAction?: 'APPROVE' | 'OVERRIDE' | 'DISMISS';
  // Decoy Detection Fields
  decoyProbability: number; // 0-1
  authenticity: Authenticity;
  decoyReason?: string;
}

export interface SystemStats {
  activeThreats: number;
  criticalAlerts: number;
  interceptorReadiness: number;
  systemHealth: number;
}
