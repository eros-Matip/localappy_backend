"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
jest.mock("twilio", () => {
    return () => ({
        messages: {
            create: jest.fn().mockResolvedValue({ sid: "SM_TEST" }),
        },
    });
});
jest.setTimeout(30000);
(0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const uri = process.env.MONGO_TEST_URI;
    if (!uri)
        throw new Error("Missing MONGO_TEST_URI");
    yield mongoose_1.default.connect(uri);
    yield ((_b = (_a = mongoose_1.default.connection) === null || _a === void 0 ? void 0 : _a.db) === null || _b === void 0 ? void 0 : _b.dropDatabase());
}));
(0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
}));
jest.mock("axios", () => {
    var _a;
    const actual = jest.requireActual("axios");
    const axiosInstance = (_a = actual.default) !== null && _a !== void 0 ? _a : actual;
    const mocked = Object.assign(Object.assign({}, axiosInstance), { get: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () {
            return ({
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
            });
        })) });
    return Object.assign(Object.assign({ __esModule: true }, actual), { default: mocked, get: mocked.get });
});
jest.mock("cloudinary", () => ({
    v2: {
        uploader: {
            upload: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () {
                return ({
                    secure_url: "https://example.com/fake.jpg",
                    public_id: "fake_public_id",
                });
            })),
        },
    },
    uploader: {
        upload: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                secure_url: "https://example.com/fake.jpg",
                public_id: "fake_public_id",
            });
        })),
        destroy: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { return ({ result: "ok" }); })),
    },
}));
const server_1 = __importDefault(require("../server"));
const Owner_1 = __importDefault(require("../models/Owner"));
(0, globals_1.describe)("E2E - Full flow (Option B)", () => {
    let adminToken;
    let customerId;
    let ownerToken;
    let ownerId;
    let establishmentId;
    let draftEventId;
    let publishedEventId;
    (0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connection.close();
    }));
    (0, globals_1.it)("1) create customer (admin token)", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const res = yield (0, supertest_1.default)(server_1.default)
            .post("/customer/create")
            .send({
            email: `customer+${Date.now()}@test.com`,
            name: "Test",
            firstname: "Customer",
            password: "123456",
            passwordConfirmed: "123456",
        });
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)((_a = res.body.customer) === null || _a === void 0 ? void 0 : _a.token).toBeTruthy();
        (0, globals_1.expect)((_b = res.body.customer) === null || _b === void 0 ? void 0 : _b._id).toBeTruthy();
        adminToken = res.body.customer.token;
        customerId = res.body.customer._id;
    }));
    (0, globals_1.it)("2) create owner (route protégée AdminIsAuthenticated)", () => __awaiter(void 0, void 0, void 0, function* () {
        (0, globals_1.expect)(adminToken).toBeTruthy();
        (0, globals_1.expect)(customerId).toBeTruthy();
        const res = yield (0, supertest_1.default)(server_1.default)
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
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)(res.body.token).toBeTruthy();
        (0, globals_1.expect)(res.body.ownerId).toBeTruthy();
        ownerToken = res.body.token;
        ownerId = res.body.ownerId;
    }));
    (0, globals_1.it)("3) patch owner verified (sinon establishment = 403)", () => __awaiter(void 0, void 0, void 0, function* () {
        (0, globals_1.expect)(ownerId).toBeTruthy();
        const upd = yield Owner_1.default.updateOne({ _id: ownerId }, { $set: { isVerified: true } });
        (0, globals_1.expect)(upd.acknowledged).toBe(true);
    }));
    (0, globals_1.it)("4) create establishment", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        (0, globals_1.expect)(ownerToken).toBeTruthy();
        const res = yield (0, supertest_1.default)(server_1.default)
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
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)((_a = res.body.establishment) === null || _a === void 0 ? void 0 : _a._id).toBeTruthy();
        establishmentId = res.body.establishment._id;
    }));
    (0, globals_1.it)("5) create draft event (nécessite upload image)", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        (0, globals_1.expect)(establishmentId).toBeTruthy();
        (0, globals_1.expect)(ownerToken).toBeTruthy();
        const res = yield (0, supertest_1.default)(server_1.default)
            .post(`/event/createDraft/${establishmentId}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .attach("photos", Buffer.from("fake"), "test.jpg");
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)((_a = res.body.event) === null || _a === void 0 ? void 0 : _a._id).toBeTruthy();
        (0, globals_1.expect)((_b = res.body.event) === null || _b === void 0 ? void 0 : _b.isDraft).toBe(true);
        draftEventId = res.body.event._id;
    }));
    (0, globals_1.it)("6) publish event from draft", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        (0, globals_1.expect)(establishmentId).toBeTruthy();
        (0, globals_1.expect)(ownerToken).toBeTruthy();
        (0, globals_1.expect)(draftEventId).toBeTruthy();
        const res = yield (0, supertest_1.default)(server_1.default)
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
            owner: { email: "owner@test.com" },
        });
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)((_a = res.body.event) === null || _a === void 0 ? void 0 : _a._id).toBeTruthy();
        (0, globals_1.expect)((_b = res.body.event) === null || _b === void 0 ? void 0 : _b.isDraft).toBe(false);
        publishedEventId = res.body.event._id;
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZTJlLmZ1bGxGbG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdGVzdHMvZTJlLmZ1bGxGbG93LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBMEU7QUFDMUUsMERBQWdDO0FBQ2hDLHdEQUFnQztBQUVoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDdkIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ1osUUFBUSxFQUFFO1lBQ1IsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQztTQUN4RDtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUV2QixJQUFBLG1CQUFTLEVBQUMsR0FBUyxFQUFFOztJQUNuQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztJQUN2QyxJQUFJLENBQUMsR0FBRztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUdwRCxNQUFNLGtCQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLE1BQU0sQ0FBQSxNQUFBLE1BQUEsa0JBQVEsQ0FBQyxVQUFVLDBDQUFFLEVBQUUsMENBQUUsWUFBWSxFQUFFLENBQUEsQ0FBQztBQUNoRCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsSUFBQSxrQkFBUSxFQUFDLEdBQVMsRUFBRTtJQUNsQixNQUFNLGtCQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTs7SUFDdEIsTUFBTSxNQUFNLEdBQUcs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