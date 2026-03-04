import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

jest.mock("twilio", () => {
  return () => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: "SM_TEST" }),
    },
  });
});

jest.setTimeout(30000);

beforeAll(async () => {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) throw new Error("Missing MONGO_TEST_URI");

  // optionnel mais pratique pour repartir clean à chaque run
  await mongoose.connect(uri);
  await mongoose.connection?.db?.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  const axiosInstance = actual.default ?? actual;

  // on garde tout (dont create), et on remplace juste get
  const mocked = {
    ...axiosInstance,
    get: jest.fn(async () => ({
      data: {
        features: [
          {
            geometry: { coordinates: [-1.5, 43.5] },
            properties: {
              context: "64, Pyrénées-Atlantiques, Nouvelle-Aquitaine",
            },
          },
        ],
      },
    })),
  };

  return {
    __esModule: true,
    ...actual,
    default: mocked,
    get: mocked.get,
  };
});

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      upload: jest.fn(async () => ({
        secure_url: "https://example.com/fake.jpg",
        public_id: "fake_public_id",
      })),
    },
  },
  uploader: {
    upload: jest.fn(async () => ({
      secure_url: "https://example.com/fake.jpg",
      public_id: "fake_public_id",
    })),
    destroy: jest.fn(async () => ({ result: "ok" })),
  },
}));

import app from "../server";
import Owner from "../models/Owner";

describe("E2E - Full flow (Option B)", () => {
  let adminToken: string; // en réalité token Customer utilisé par AdminIsAuthenticated
  let customerId: string;

  let ownerToken: string;
  let ownerId: string;

  let establishmentId: string;

  let draftEventId: string;
  let publishedEventId: string;

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("1) create customer (admin token)", async () => {
    const res = await request(app)
      .post("/customer/create")
      .send({
        email: `customer+${Date.now()}@test.com`,
        name: "Test",
        firstname: "Customer",
        password: "123456",
        passwordConfirmed: "123456",
        // address/city/zip optionnels (mais si tu les mets, ça appelle api-adresse)
      });

    expect(res.status).toBe(201);
    expect(res.body.customer?.token).toBeTruthy();
    expect(res.body.customer?._id).toBeTruthy();

    adminToken = res.body.customer.token;
    customerId = res.body.customer._id;
  });

  it("2) create owner (route protégée AdminIsAuthenticated)", async () => {
    expect(adminToken).toBeTruthy();
    expect(customerId).toBeTruthy();

    const res = await request(app)
      .post("/owner/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: `owner+${Date.now()}@test.com`,
        name: "Test",
        firstname: "Owner",
        phoneNumber: "0612345678",
        password: "123456",
        passwordConfirmed: "123456",
        customerId,
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.ownerId).toBeTruthy();

    ownerToken = res.body.token;
    ownerId = res.body.ownerId;
  });

  it("3) patch owner verified (sinon establishment = 403)", async () => {
    expect(ownerId).toBeTruthy();

    const upd = await Owner.updateOne(
      { _id: ownerId },
      { $set: { isVerified: true } },
    );

    // selon mongoose, tu peux checker modifiedCount / acknowledged
    expect(upd.acknowledged).toBe(true);
  });

  it("4) create establishment", async () => {
    expect(ownerToken).toBeTruthy();

    const res = await request(app)
      .post("/establishment/create")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        activity: "Restaurant",
        adressLabel: "1 rue du test 64100 Bayonne",
        society: "Test SARL",
        adress: "1 rue du test",
        city: "Bayonne",
        zip: "64100",
        legalForm: "company",
        siret: "12345678901234",
        activityCodeNAF: "5610A",
      });

    expect(res.status).toBe(201);
    expect(res.body.establishment?._id).toBeTruthy();

    establishmentId = res.body.establishment._id;
  });

  it("5) create draft event (nécessite upload image)", async () => {
    expect(establishmentId).toBeTruthy();
    expect(ownerToken).toBeTruthy();

    const res = await request(app)
      .post(`/event/createDraft/${establishmentId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      // createDraftEvent refuse si aucune image => on joint un faux fichier
      .attach("photos", Buffer.from("fake"), "test.jpg");

    expect(res.status).toBe(201);
    expect(res.body.event?._id).toBeTruthy();
    expect(res.body.event?.isDraft).toBe(true);

    draftEventId = res.body.event._id;
  });

  it("6) publish event from draft", async () => {
    expect(establishmentId).toBeTruthy();
    expect(ownerToken).toBeTruthy();
    expect(draftEventId).toBeTruthy();

    const res = await request(app)
      .post(`/event/createForAnEstablishment/${establishmentId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        draftId: draftEventId,
        title: "Soirée test",
        startingDate: new Date().toISOString(),
        endingDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        theme: ["Music"],
        price: 10,
        capacity: 50,
        owner: { email: "owner@test.com" }, // ton controller lit req.body.owner.email pour MailerSend
      });

    expect(res.status).toBe(201);
    expect(res.body.event?._id).toBeTruthy();
    expect(res.body.event?.isDraft).toBe(false);

    publishedEventId = res.body.event._id;
  });
});
