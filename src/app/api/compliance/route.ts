import { request } from 'http';
import {v4 as uuidv4} from 'uuid';
export const runtime = "nodejs"; // ensures Node runtime (Circle expects normal server fetch behavior)

type Body = {
  idempotencyKey: string;
  address: string;
  chain: string; // e.g. "MATIC-AMOY"
};

export async function POST(req: Request) {
  try {
    const token = process.env.CIRCLE_API_KEY;
    if (!token) {
      return Response.json(
        { error: "Missing CIRCLE_API_KEY env var", success: false},
      );
    }

    
    const { address } = (await req.json());

    if (!address){
        return Response.json(
            { error: 'Address is required', success: false },
        )
    }

    const complianceEnabled = process.env.ENABLE_COMPLIANE_CHECK==='true';
    if(!complianceEnabled){
        console.log("compliance check is disabled")
        return Response.json({
            success:true,
            isApproved: true,
            data: {
                result: "APPROVED",
                message: "Compliance check is disabled"
            }
        })
    }
    const chain = 'ETH-SEPOLIA'
    const idempotencyKey: string = uuidv4();
    if (!idempotencyKey || !address || !chain) {
      return Response.json(
        { error: "Required: idempotencyKey, address, chain" },
        { status: 400 }
      );
    }

    const circleRes = await fetch(
      "https://api.circle.com/v1/w3s/compliance/screening/addresses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // pass-through as Circle expects
        body: JSON.stringify({ idempotencyKey, address, chain }),
      }
    );

    const data = await circleRes.json().catch(() => null);

    // If Circle returns non-2xx, forward useful info
    if (!circleRes.ok) {
      return Response.json(
        {
          error: "Circle API error",
          status: circleRes.status,
          details: data,
        },
        { status: circleRes.status }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { error: "Unexpected server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
