const dateKey = (date, period) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  if (period === 'yearly') return `${year}`;
  if (period === 'monthly') return `${year}-${month}`;
  if (period === 'weekly') {
    const first = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - first) / 86400000) + first.getUTCDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  return `${year}-${month}-${day}`;
};

export class AggregationLayer {
  aggregate(events, { metric, period = 'monthly', filters = {} } = {}) {
    const filtered = events.filter((event) => {
      if (metric && event.type !== metric) return false;
      return Object.entries(filters).every(([key, expected]) => {
        const actual = event[key] ?? event.dimensions?.[key];
        return String(actual) === String(expected);
      });
    });

    const buckets = filtered.reduce((acc, event) => {
      const key = dateKey(event.occurredAt, period);
      acc[key] = acc[key] || { key, count: 0, value: 0 };
      acc[key].count += 1;
      acc[key].value += Number(event.value || 1);
      return acc;
    }, {});

    return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
  }

  funnel(events) {
    const order = [
      'job_created',
      'application_submitted',
      'assessment_completed',
      'interview_completed',
      'hiring_completed',
    ];
    return order.map((type) => ({
      stage: type,
      count: events.filter((event) => event.type === type).length,
    }));
  }

  groupBy(events, dimension) {
    return events.reduce((acc, event) => {
      const key = event[dimension] ?? event.dimensions?.[dimension] ?? 'unknown';
      acc[key] = (acc[key] || 0) + Number(event.value || 1);
      return acc;
    }, {});
  }
}

export default AggregationLayer;
