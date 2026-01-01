// Trackman API types

export interface TrackmanAuthState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isExtensionInstalled: boolean;
  capturedAt: number | null;
}

export interface Activity {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shotCount: number;
  duration?: number;
  location?: string;
}

export interface Shot {
  id: string;
  sessionId: string;
  club: string;
  timestamp: string;
  ballData: BallData;
  clubData: ClubData;
}

export interface BallData {
  speed: number; // mph
  launchAngle: number; // degrees
  launchDirection: number; // degrees
  spinRate: number; // rpm
  spinAxis: number; // degrees
  carry: number; // yards
  total: number; // yards
  height: number; // feet
  landingAngle: number; // degrees
  hangTime: number; // seconds
  curve: number; // yards
}

export interface ClubData {
  speed: number; // mph
  attackAngle: number; // degrees
  clubPath: number; // degrees
  faceAngle: number; // degrees
  faceToPath: number; // degrees
  dynamicLoft: number; // degrees
  spinLoft: number; // degrees
  impactLocation?: {
    horizontal: number;
    vertical: number;
  };
}

export interface SessionDetails {
  id: string;
  activity: Activity;
  shots: Shot[];
  summary: SessionSummary;
}

export interface SessionSummary {
  totalShots: number;
  clubsUsed: string[];
  averages: {
    [club: string]: {
      carry: number;
      total: number;
      ballSpeed: number;
      launchAngle: number;
      spinRate: number;
    };
  };
}
