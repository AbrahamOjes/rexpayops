export class MetricsService {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  recordSuccess(operation: string, duration: number): void {
    // Implement metrics recording for successful operations
    // This could be integrated with your metrics system (e.g., Datadog, Prometheus)
    console.log(`[METRICS] ${this.serviceName}.${operation}.success duration=${duration}ms`);
  }

  recordError(operation: string, error: any): void {
    // Implement metrics recording for failed operations
    // This could be integrated with your metrics system
    console.log(`[METRICS] ${this.serviceName}.${operation}.error code=${error.response?.status || 'unknown'}`);
  }

  // Add more metric recording methods as needed
  recordLatency(operation: string, duration: number): void {
    console.log(`[METRICS] ${this.serviceName}.${operation}.latency duration=${duration}ms`);
  }

  recordAuthorizationRate(success: boolean): void {
    console.log(`[METRICS] ${this.serviceName}.authorization.rate success=${success}`);
  }
}
