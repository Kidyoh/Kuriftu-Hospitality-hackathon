
import { useEffect } from "react";
import { ensureStorageBuckets } from "@/utils/storage";
import { useAuth } from "@/contexts/AuthContext";

export default function StorageInit() {
  const { profile } = useAuth();
  
  useEffect(() => {
    // Only initialize storage if user is admin
    if (profile && profile.role === 'admin') {
      ensureStorageBuckets();
    }
  }, [profile]);
  
  // This component doesn't render anything
  return null;
}
