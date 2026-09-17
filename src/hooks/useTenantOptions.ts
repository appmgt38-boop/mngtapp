import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTenantOptions } from "@/lib/config.functions";
import { DEFAULT_DEPARTMENTS, DEFAULT_POSITIONS, DEFAULT_SCHEDULE_TYPES } from "@/lib/config";

export interface TenantOptions {
  positions: string[];
  departments: string[];
  scheduleTypes: string[];
}

const FALLBACK: TenantOptions = {
  positions: [...DEFAULT_POSITIONS],
  departments: [...DEFAULT_DEPARTMENTS],
  scheduleTypes: [...DEFAULT_SCHEDULE_TYPES],
};

/**
 * The single source of truth for staff positions, departments and schedule
 * types: whatever is configured under System Configuration → Tenant policy.
 * Falls back to the platform defaults until a tenant has been configured.
 */
export function useTenantOptions(): TenantOptions {
  const load = useServerFn(getTenantOptions);
  const [options, setOptions] = useState<TenantOptions>(FALLBACK);

  useEffect(() => {
    let active = true;
    void load()
      .then((o) => {
        if (!active) return;
        setOptions({
          positions: o.positions?.length ? o.positions : FALLBACK.positions,
          departments: o.departments?.length ? o.departments : FALLBACK.departments,
          scheduleTypes: o.scheduleTypes?.length ? o.scheduleTypes : FALLBACK.scheduleTypes,
        });
      })
      .catch(() => setOptions(FALLBACK));
    return () => {
      active = false;
    };
  }, []);

  return options;
}
