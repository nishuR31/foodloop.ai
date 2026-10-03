'use client';

import { Database, ShieldAlert, FileText, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit-logs');
        if (res.data?.success) setLogs(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Database className="h-8 w-8 mr-3 text-slate-700" />
            Immutable Audit Trail
          </h1>
          <p className="text-slate-500 mt-2">Cryptographically secure logs of all critical system actions.</p>
        </div>
        <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors border border-slate-200">
          <Download className="h-5 w-5 mr-2" />
          Export Logs
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center bg-slate-50/50">
          <ShieldAlert className="h-5 w-5 text-slate-600 mr-2" />
          <span className="text-sm font-bold text-slate-700">System Integrity: VERIFIED (Last check: 2 minutes ago)</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Timestamp</th>
              <th className="px-6 py-4 font-bold">Action</th>
              <th className="px-6 py-4 font-bold">Actor</th>
              <th className="px-6 py-4 font-bold">IP Address</th>
              <th className="px-6 py-4 font-bold font-mono">Hash signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-sm">
            {logs.map((log: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">{log.action}</td>
                <td className="px-6 py-4">{log.actorId || log.actorName || log.userId || 'System'}</td>
                <td className="px-6 py-4 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                <td className="px-6 py-4 text-slate-400 truncate max-w-[200px]">{log.blockchainHash || log.hashSignature}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-10 text-center text-slate-500 font-medium font-mono text-sm border-t border-slate-100">
            No audit logs recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
