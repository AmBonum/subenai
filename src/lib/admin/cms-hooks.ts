import { useSyncExternalStore } from "react";

import {
  cmsFooterStore,
  cmsHeaderStore,
  cmsNavigationStore,
  cmsPagesStore,
  cmsQuickTestConfigStore,
  cmsShareCardStore,
} from "@/lib/admin/cms-mock-store";

export function usePages() {
  return useSyncExternalStore(cmsPagesStore.subscribe, cmsPagesStore.get, cmsPagesStore.get);
}

export function useCmsHeader() {
  return useSyncExternalStore(cmsHeaderStore.subscribe, cmsHeaderStore.get, cmsHeaderStore.get);
}

export function useCmsFooter() {
  return useSyncExternalStore(cmsFooterStore.subscribe, cmsFooterStore.get, cmsFooterStore.get);
}

export function useCmsNavigation() {
  return useSyncExternalStore(
    cmsNavigationStore.subscribe,
    cmsNavigationStore.get,
    cmsNavigationStore.get,
  );
}

export function useCmsShareCard() {
  return useSyncExternalStore(
    cmsShareCardStore.subscribe,
    cmsShareCardStore.get,
    cmsShareCardStore.get,
  );
}

export function useQuickTestConfig() {
  return useSyncExternalStore(
    cmsQuickTestConfigStore.subscribe,
    cmsQuickTestConfigStore.get,
    cmsQuickTestConfigStore.get,
  );
}
