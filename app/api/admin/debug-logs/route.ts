import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { getLogBuffer, clearLogBuffer } from '@/lib/ops-logger';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const correlationId = searchParams.get('correlationId');
  const scope = searchParams.get('scope');
  const level = searchParams.get('level');

  let entries = getLogBuffer();

  if (correlationId) {
    entries = entries.filter((e) => e.correlationId.includes(correlationId));
  }
  if (scope) {
    entries = entries.filter((e) => e.scope.includes(scope));
  }
  if (level) {
    entries = entries.filter((e) => e.level === level);
  }

  return NextResponse.json({
    total: entries.length,
    entries,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  clearLogBuffer();
  return NextResponse.json({ message: 'Buffer limpiado' });
}
