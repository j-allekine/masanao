import { Prisma } from "@/lib/generated/prisma/client";
import { listActivityDesigns } from "@/lib/activity-designs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const activityDesignSchema = z.object({
  activityDesignNo: z
    .string()
    .trim()
    .min(1, "Activity Design No. is required")
    .max(100, "Activity Design No. must be 100 characters or fewer")
    .transform((value) => value.toLowerCase()),
  fiscalYear: z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() !== "") {
        return Number(value);
      }

      return value;
    },
    z
      .number()
      .int("Fiscal year must be a whole year")
      .min(1900, "Fiscal year must be 1900 or later")
      .max(9999, "Fiscal year must be 9999 or earlier"),
  ),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  officeName: z
    .string()
    .trim()
    .min(1, "Office name is required")
    .max(200, "Office name must be 200 characters or fewer"),
  aipReferenceCode: z.preprocess(
    (value) => {
      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .trim()
      .max(100, "AIP Reference Code must be 100 characters or fewer")
      .optional(),
  ),
});

const activityDesignResponseSelect = {
  id: true,
  activityDesignNo: true,
  fiscalYear: true,
  title: true,
  officeName: true,
  aipReferenceCode: true,
} as const;

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function invalidActivityDesignDetails(error: z.ZodError) {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fields[field] ??= [];
    fields[field].push(issue.message);
  }

  return Response.json(
    {
      error: "Please correct the highlighted Activity Design fields.",
      fields,
    },
    { status: 400 },
  );
}

async function requireAuthenticated(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
}

export async function GET(request: Request) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  return Response.json({ activityDesigns: await listActivityDesigns() });
}

export async function POST(request: Request) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = activityDesignSchema.safeParse(await readJson(request));
  if (!parsedBody.success) return invalidActivityDesignDetails(parsedBody.error);

  try {
    const activityDesign = await prisma.activityDesign.create({
      data: {
        id: crypto.randomUUID(),
        ...parsedBody.data,
        aipReferenceCode: parsedBody.data.aipReferenceCode ?? null,
      },
      select: activityDesignResponseSelect,
    });

    return Response.json(
      {
        activityDesign: {
          ...activityDesign,
          activityCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error: "An Activity Design with that number already exists.",
          fields: {
            activityDesignNo: [
              "An Activity Design with that number already exists.",
            ],
          },
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
