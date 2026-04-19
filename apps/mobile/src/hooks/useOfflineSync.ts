/**
 * useOfflineSync — manages background sync when connectivity is restored.
 *
 * On mount: starts NetInfo listener.
 * On reconnect: flushes pending mutation queue → calls api.
 * Conflict resolution: if server returns 409, calls onConflict(local, server)
 * so the UI can show a diff and let the user decide.
 */
import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { api } from "../services/api";
import { getPendingMutations, removeMutation, PendingMutation } from "../services/storage";

interface ConflictInfo {
  mutation: PendingMutation;
  localData: object;
  serverData: object;
}

interface UseOfflineSyncOptions {
  onConflict?: (info: ConflictInfo) => void;
  onSyncComplete?: (synced: number) => void;
}

export function useOfflineSync(opts?: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isMounted = useRef(true);

  async function flushQueue() {
    if (isSyncing) return;
    setIsSyncing(true);
    const mutations = await getPendingMutations();
    setPendingCount(mutations.length);
    let synced = 0;

    for (const mutation of mutations) {
      try {
        if (mutation.method === "POST") await api.post(mutation.url, mutation.payload);
        else if (mutation.method === "PUT") await api.put(mutation.url, mutation.payload);
        else if (mutation.method === "PATCH") await api.patch(mutation.url, mutation.payload);
        else if (mutation.method === "DELETE") await api.delete(mutation.url);
        await removeMutation(mutation.id);
        synced++;
      } catch (err: any) {
        if (err.response?.status === 409 && opts?.onConflict) {
          opts.onConflict({ mutation, localData: mutation.payload, serverData: err.response.data });
        }
        // Leave in queue for retry (max 3 retries before dropping)
        if (mutation.retries >= 3) await removeMutation(mutation.id);
      }
    }

    if (isMounted.current) {
      setIsSyncing(false);
      const remaining = await getPendingMutations();
      setPendingCount(remaining.length);
      if (synced > 0) opts?.onSyncComplete?.(synced);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      if (online) flushQueue();
    });
    // Check pending count on mount
    getPendingMutations().then((m) => setPendingCount(m.length));
    return () => { isMounted.current = false; unsub(); };
  }, []);

  return { isOnline, isSyncing, pendingCount };
}
