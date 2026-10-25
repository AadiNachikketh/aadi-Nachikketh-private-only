import { NextResponse } from 'next/server';
import { buildUserGuidePdf } from '../../../src/utils/pdf-guide';

export async function GET() {
  const doc = buildUserGuidePdf('Agency Command Center');
  const arrayBuffer = doc.output('arraybuffer');

  return new NextResponse(Buffer.from(arrayBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Agency_Command_Center_User_Guide.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
