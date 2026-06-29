import AggregationLayer from '../aggregation/aggregationLayer.js';
import exportService from './export.service.js';

export class AnalyticsService {
  constructor() {
    this.aggregation = new AggregationLayer();
    this.reset();
  }

  reset() {
    this.events = [
      { id: 'evt_1', type: 'job_created', value: 1, occurredAt: '2026-06-01T00:00:00.000Z', dimensions: { recruiterId: 'rec_1', organizationId: 'org_1' } },
      { id: 'evt_2', type: 'application_submitted', value: 1, occurredAt: '2026-06-02T00:00:00.000Z', dimensions: { candidateId: 'cand_1', jobId: 'job_1', organizationId: 'org_1' } },
      { id: 'evt_3', type: 'assessment_completed', value: 1, occurredAt: '2026-06-03T00:00:00.000Z', dimensions: { candidateId: 'cand_1', assessmentId: 'assess_1', organizationId: 'org_1' } },
      { id: 'evt_4', type: 'interview_completed', value: 1, occurredAt: '2026-06-04T00:00:00.000Z', dimensions: { interviewerId: 'rec_1', organizationId: 'org_1' } },
      { id: 'evt_5', type: 'hiring_completed', value: 1, occurredAt: '2026-06-05T00:00:00.000Z', dimensions: { recruiterId: 'rec_1', organizationId: 'org_1' } },
    ];
  }

  record(event) {
    const stored = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      value: 1,
      occurredAt: new Date().toISOString(),
      dimensions: {},
      ...event,
    };
    this.events.push(stored);
    return stored;
  }

  dashboard(period = 'monthly') {
    return {
      hiringFunnel: this.aggregation.funnel(this.events),
      recruiterAnalytics: this.aggregation.groupBy(this.events, 'recruiterId'),
      candidateAnalytics: this.aggregation.groupBy(this.events, 'candidateId'),
      jobAnalytics: this.aggregation.groupBy(this.events, 'jobId'),
      interviewAnalytics: this.metrics({ metric: 'interview_completed', period }),
      assessmentAnalytics: this.metrics({ metric: 'assessment_completed', period }),
      organizationAnalytics: this.aggregation.groupBy(this.events, 'organizationId'),
    };
  }

  metrics(query = {}) {
    return this.aggregation.aggregate(this.events, query);
  }

  report(type = 'hiring_funnel', period = 'monthly') {
    if (type === 'hiring_funnel') {
      return this.aggregation.funnel(this.events);
    }
    return this.metrics({ metric: type, period });
  }

  chart(type = 'hiring_funnel', period = 'monthly') {
    const data = this.report(type, period);
    return {
      type,
      period,
      labels: data.map((item) => item.stage || item.key),
      series: data.map((item) => item.count ?? item.value),
    };
  }

  export(format = 'csv', type = 'hiring_funnel', period = 'monthly') {
    const rows = this.report(type, period);
    if (format === 'pdf') {
      return { contentType: 'application/pdf', filename: `${type}.pdf`, body: exportService.toPdf(rows) };
    }
    if (format === 'xlsx' || format === 'excel') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${type}.xlsx`,
        body: exportService.toExcel(rows),
      };
    }
    return { contentType: 'text/csv', filename: `${type}.csv`, body: exportService.toCsv(rows) };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
