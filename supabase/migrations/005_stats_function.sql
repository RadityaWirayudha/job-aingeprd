CREATE OR REPLACE FUNCTION get_aingeprd_stats()
RETURNS TABLE(user_count bigint, prd_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    (SELECT count(DISTINCT user_id) FROM (
      SELECT user_id FROM aingeprd_tasks
      UNION
      SELECT user_id FROM aingeprd_sessions
    ) AS all_users) AS user_count,
    (SELECT count(*) FROM aingeprd_tasks) AS prd_count;
$$;
