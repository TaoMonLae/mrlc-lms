import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export type HealthCheckStatus = 'ok' | 'warning' | 'error';

export interface HealthCheckResult {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
  required: boolean;
}

export async function checkWritableDirectory(id: string, label: string, directory: string): Promise<HealthCheckResult> {
  try {
    await fs.promises.mkdir(directory, { recursive: true });
    const probe = path.join(directory, `.health-${process.pid}-${Date.now()}`);
    await fs.promises.writeFile(probe, 'ok', { flag: 'wx' });
    await fs.promises.unlink(probe);
    return { id, label, status: 'ok', detail: directory, required: true };
  } catch (error: any) {
    return { id, label, status: 'error', detail: error?.message || 'Directory is not writable', required: true };
  }
}

export function probeCommand(
  id: string,
  label: string,
  command: string,
  args: string[],
  required: boolean,
  timeoutMs = 5_000,
): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const finish = (result: HealthCheckResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ id, label, status: required ? 'error' : 'warning', detail: 'Check timed out', required });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { output = `${output}${chunk.toString()}`.slice(0, 500); });
    child.stderr.on('data', (chunk) => { output = `${output}${chunk.toString()}`.slice(0, 500); });
    child.on('error', (error) => finish({
      id, label, status: required ? 'error' : 'warning', detail: error.message, required,
    }));
    child.on('close', (code) => finish({
      id,
      label,
      status: code === 0 ? 'ok' : required ? 'error' : 'warning',
      detail: code === 0 ? (output.trim().split(/\r?\n/)[0] || 'Available') : `Exited with code ${code}${output.trim() ? `: ${output.trim()}` : ''}`,
      required,
    }));
  });
}

export function summarizeHealth(checks: HealthCheckResult[]): HealthCheckStatus {
  if (checks.some((check) => check.status === 'error')) return 'error';
  if (checks.some((check) => check.status === 'warning')) return 'warning';
  return 'ok';
}
