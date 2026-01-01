// Trackman GraphQL API client - proxies requests through extension

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || '';

interface GraphQLResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!EXTENSION_ID) {
    throw new Error('Extension ID not configured');
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        type: 'GRAPHQL_REQUEST',
        query,
        variables,
      },
      (response: GraphQLResponse<T>) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.success && response.data !== undefined) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'GraphQL request failed'));
        }
      }
    );
  });
}

// GraphQL Queries
const GET_PLAYER_ACTIVITIES = `
  query getPlayerActivities($take: Int, $skip: Int, $activityKinds: [ActivityKind!]) {
    me {
      profile {
        fullName
      }
      activities(take: $take, skip: $skip, kinds: $activityKinds) {
        items {
          id
          kind
          time
          ... on RangePracticeActivity {
            numberOfStrokes
          }
          ... on ShotAnalysisSessionActivity {
            strokeCount
            reportLink
          }
          ... on SessionActivity {
            strokeCount
          }
          ... on VirtualRangeSessionActivity {
            strokeCount
          }
          ... on CoursePlayActivity {
            gameType
            grossScore
            toPar
            scorecard {
              id
            }
            course {
              displayName
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
        totalCount
      }
    }
  }
`;

const GET_SCORECARD = `
  query getLeaderboardScorecard($scorecardId: ID!, $scoringFormat: GameTypes!) {
    node(id: $scorecardId) {
      ... on Scorecard {
        withScoringFormat(scoringFormat: $scoringFormat) {
          id
          createdAt
          startedAt
          gameSettings {
            gameBall
            gamePlay
            gameScore
            units
          }
          player {
            name
            hcp
            courseHcp
            tee
          }
          holes {
            holeNumber
            par
            distance
            netScore
            grossScore
            stablefordPoint
            hcpStrokes
            shots {
              shotNumber
            }
          }
          course {
            displayName
            tee {
              name
            }
          }
        }
      }
    }
  }
`;

// Types
export interface Activity {
  id: string;
  kind: string;
  time: string;
  numberOfStrokes?: number;
  strokeCount?: number;
  reportLink?: string;
  gameType?: string;
  grossScore?: number;
  toPar?: number;
  scorecard?: {
    id: string;
  };
  course?: {
    displayName: string;
  };
}

interface ActivitiesResponse {
  me: {
    profile: {
      fullName: string;
    };
    activities: {
      items: Activity[];
      totalCount: number;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    };
  };
}

export interface Hole {
  holeNumber: number;
  par: number;
  distance: number;
  netScore: number;
  grossScore: number;
  stablefordPoint: number;
  hcpStrokes: number;
  strokeIndex: number;
  mulligans: number;
  shots: { shotNumber: number }[];
}

export interface Scorecard {
  id: string;
  createdAt: string;
  startedAt: string;
  gameSettings: {
    gameBall: string;
    gamePlay: string;
    gameScore: string;
    units: string;
  };
  player: {
    name: string;
    hcp: number;
    courseHcp: number;
    tee: string;
  };
  holes: Hole[];
  course: {
    displayName: string;
    tee: {
      name: string;
    };
  };
  tees?: {
    name: string;
    holes: {
      holeNumber: number;
      par: number;
      distance: number;
      strokeIndex: number;
    }[];
  }[];
}

interface ScorecardResponse {
  node: {
    withScoringFormat: Scorecard;
  };
}

// Activity Report types (for shot analysis)
export interface Measurement {
  ClubSpeed?: number;
  AttackAngle?: number;
  BallSpeed?: number;
  LaunchAngle?: number;
  LaunchDirection?: number;
  SpinRate?: number;
  SpinAxis?: number;
  Carry?: number;
  Total?: number;
  CarrySide?: number;
  TotalSide?: number;
  MaxHeight?: number;
  HangTime?: number;
  LandingAngle?: number;
  SmashFactor?: number;
  ClubPath?: number;
  FaceAngle?: number;
  FaceToPath?: number;
  DynamicLoft?: number;
}

export interface Stroke {
  Id: string;
  Time: string;
  Club: string;
  Measurement?: Measurement;
  NormalizedMeasurement?: Measurement;
}

export interface StrokeGroup {
  Id: string;
  Date: string;
  Club: string;
  Strokes: Stroke[];
  Player?: {
    Name: string;
  };
}

export interface ActivityReport {
  Kind: string;
  StrokeGroups: StrokeGroup[];
  Settings?: {
    Tiles?: string[];
  };
  Time?: string;
}

async function activityReportRequest(activityId: string): Promise<ActivityReport> {
  if (!EXTENSION_ID) {
    throw new Error('Extension ID not configured');
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        type: 'ACTIVITY_REPORT_REQUEST',
        activityId,
      },
      (response: { success: boolean; data?: ActivityReport; error?: string }) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.success && response.data) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Activity report request failed'));
        }
      }
    );
  });
}

// Extract activity ID from reportLink URL
function extractActivityIdFromReportLink(reportLink: string): string | null {
  try {
    const url = new URL(reportLink);
    return url.searchParams.get('a');
  } catch {
    return null;
  }
}

export const trackmanApi = {
  getActivities: async (params?: { take?: number; skip?: number }) => {
    const response = await graphqlRequest<ActivitiesResponse>(GET_PLAYER_ACTIVITIES, {
      take: params?.take || 50,
      skip: params?.skip || 0,
      activityKinds: [
        'RANGE_PRACTICE',
        'SHOT_ANALYSIS',
        'SESSION',
        'VIRTUAL_RANGE',
        'COURSE_PLAY',
      ],
    });
    return {
      items: response.me.activities.items,
      total: response.me.activities.totalCount,
      profile: response.me.profile,
    };
  },

  getScorecard: async (scorecardId: string, scoringFormat = 'STROKE_NET') => {
    const response = await graphqlRequest<ScorecardResponse>(GET_SCORECARD, {
      scorecardId,
      scoringFormat,
    });
    return response.node.withScoringFormat;
  },

  getActivityReport: async (reportLink: string) => {
    const activityId = extractActivityIdFromReportLink(reportLink);
    if (!activityId) {
      throw new Error('Could not extract activity ID from report link');
    }
    return activityReportRequest(activityId);
  },
};
