import { NextResponse } from " next/server" ;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(" https://api.anthropic.com/v1/messages" , {
      method: " POST" ,
      headers: {
        " content-type" : " application/json" ,
        " anthropic-version" : " 2023-06-01" ,
        " x-api-key" : process.env.ANTHROPIC_API_KEY || " " ,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { " Access-Control-Allow-Origin" : " *"  },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      " Access-Control-Allow-Origin" : " *" ,
      " Access-Control-Allow-Methods" : " POST, OPTIONS" ,
      " Access-Control-Allow-Headers" : " Content-Type" ,
    },
  });
}
