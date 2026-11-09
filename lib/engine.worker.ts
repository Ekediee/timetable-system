import { generateTimetable } from "./engine";
import type {
  Allocation,
  Venue,
  VenueRecord,
  Constraint,
  ExternalBooking,
  DynamicTimeLockConfig,
} from "./data";

export interface EngineWorkerRequest {
  type: "START";
  payload: {
    allocations: Allocation[];
    venues: (Venue | VenueRecord)[];
    activeConstraints: Constraint[];
    departmentName: string;
    options?: {
      externalBookings?: ExternalBooking[];
      exemptedDepartments?: string[];
      departmentName?: string;
      timeLockConfig?: DynamicTimeLockConfig;
    };
  };
}

export type EngineWorkerResponse =
  | {
      type: "PROGRESS";
      payload: {
        stage: string;
        percent: number;
        current?: number;
        total?: number;
      };
    }
  | {
      type: "SUCCESS";
      payload: ReturnType<typeof generateTimetable>;
    }
  | {
      type: "ERROR";
      error: string;
    };

// Worker message listener
self.addEventListener("message", (e: MessageEvent<EngineWorkerRequest>) => {
  const data = e.data;
  if (!data || data.type !== "START") return;

  try {
    const {
      allocations,
      venues,
      activeConstraints,
      departmentName,
      options,
    } = data.payload;

    const result = generateTimetable(
      allocations,
      venues,
      activeConstraints,
      departmentName,
      {
        ...options,
        onProgress: (progress) => {
          self.postMessage({
            type: "PROGRESS",
            payload: progress,
          });
        },
      },
    );

    self.postMessage({
      type: "SUCCESS",
      payload: result,
    });
  } catch (err: any) {
    self.postMessage({
      type: "ERROR",
      error: err?.message || "Failed generating timetable in worker.",
    });
  }
});

