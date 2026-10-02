import { appConfig } from "../config";

export type PublicSchedule = {
  id: string;
  execute_at_utc: string | null;
  status: string;
  schedule_type: string | null;
  unit: string | null;
  interval: number | null;
  day_of_month: number | null;
  time_utc: string | null;
  actions: { type: string; target: { module: string; scope: string; resource_type: string; resource_id: string } }[];
};

export type ScheduleFilter = { module: string; scope: string; resourceType: string };

export async function getSchedules(filter: ScheduleFilter, signal?: AbortSignal): Promise<PublicSchedule[]> {
  const module = filter.module.trim();
  const scope = filter.scope.trim();
  const resourceType = filter.resourceType.trim();
  if (!module || !scope || !resourceType) throw new Error("Module, scope and resource type are required");
  const host = appConfig.scheduledTasksApi.host.replace(/\/$/, "");
  const query = new URLSearchParams({ module, scope, resource_type: resourceType });
  const response = await fetch(`${host}/api/scheduled-tasks/schedules?${query}`, { signal });
  if (!response.ok) throw new Error(`Schedules request failed: ${response.status}`);
  return await response.json() as PublicSchedule[];
}
