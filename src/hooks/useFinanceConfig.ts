import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getActiveFinanceConfig } from "@/lib/finance-config.functions";
import {
  currencySymbol,
  optionsFrom,
  type FinanceRule,
  type ReferenceItem,
} from "@/lib/finance-config";

export interface ActiveFinanceConfig {
  schoolId: string | null;
  settings: Record<string, Record<string, unknown>>;
  items: ReferenceItem[];
  rules: FinanceRule[];
  loading: boolean;
  /** Configured options for a list, falling back to the platform defaults. */
  options: (
    listKey: string,
    fallback: readonly { value: string; label: string }[],
  ) => { value: string; label: string }[];
  money: (amount: number | string | null | undefined) => string;
  symbol: string;
}

const EMPTY: Record<string, Record<string, unknown>> = {};

/**
 * The single read path into Financial Configuration. Every finance screen
 * uses this instead of its own hardcoded lists, so the configuration is the
 * only source of truth for financial behaviour.
 */
export function useFinanceConfig(): ActiveFinanceConfig {
  const load = useServerFn(getActiveFinanceConfig);
  const [state, setState] = useState<{
    schoolId: string | null;
    settings: Record<string, Record<string, unknown>>;
    items: ReferenceItem[];
    rules: FinanceRule[];
    loading: boolean;
  }>({ schoolId: null, settings: EMPTY, items: [], rules: [], loading: true });

  useEffect(() => {
    let active = true;
    void load()
      .then((res) => {
        const r = res as {
          schoolId: string | null;
          settings: Record<string, Record<string, unknown>>;
          items: ReferenceItem[];
          rules: FinanceRule[];
        };
        if (!active) return;
        setState({
          schoolId: r.schoolId ?? null,
          settings: (r.settings ?? EMPTY) as Record<string, Record<string, unknown>>,
          items: (r.items ?? []) as ReferenceItem[],
          rules: (r.rules ?? []) as FinanceRule[],
          loading: false,
        });
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      active = false;
    };
  }, []);

  const currency = state.settings["currency"] ?? {};
  const code = String(currency["code"] ?? "GHS");
  const symbol = String(currency["symbol"] ?? currencySymbol(code));
  const locale = String(currency["locale"] ?? "en-GH");
  const decimals = Number(currency["decimal_places"] ?? 2);

  return {
    ...state,
    symbol,
    options: (listKey, fallback) => optionsFrom(state.items, listKey, fallback),
    money: (amount) => {
      const n = Number(amount ?? 0);
      const formatted = n.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${symbol}${formatted}`;
    },
  };
}
