/**
 * useDatabase Hook
 * 数据库初始化状态和操作封装
 */

import { useState, useEffect, useCallback } from 'react';
import * as Database from '../modules/storage/Database';

export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await Database.initDatabase();
        if (mounted) setReady(true);
      } catch (err) {
        if (mounted) setError(err);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const getEventsByDate = useCallback(async (date) => {
    try {
      return await Database.getEventsByDate(date);
    } catch (err) {
      setError(err);
      return [];
    }
  }, []);

  return {
    ready,
    error,
    getEventsByDate,
  };
}

export default useDatabase;
