"use client";

import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api2.sib-utrecht.nl/v2/events?count=50");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // Debug log

      // Handle different possible response structures
      let activitiesData: Activity[] = data.data?.events;

      if (!Array.isArray(activitiesData)) {
        console.warn("Unexpected API response structure:", data);
        activitiesData = [];
      }

      setActivities(activitiesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activities");
      console.error("Error fetching activities:", err);
      setActivities([]); // Ensure activities is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return { activities, loading, error, refetch: fetchActivities };
}
