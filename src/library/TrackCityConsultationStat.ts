import DailyCityConsultationStat from "../models/DailyCityConsultationStat";

interface TrackCityConsultationStatParams {
  city: string;
}

const getTodayDateString = () => {
  return new Date().toISOString().slice(0, 10);
};

export const trackCityConsultationStat = async ({
  city,
}: TrackCityConsultationStatParams) => {
  try {
    const normalizedCity = city?.trim();
    if (!normalizedCity) return;

    const date = getTodayDateString();

    await DailyCityConsultationStat.updateOne(
      { date, city: normalizedCity },
      {
        $inc: { totalConsultations: 1 },
        $setOnInsert: {
          date,
          city: normalizedCity,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Ne jamais casser la route principale
    console.error("[trackCityConsultationStat] non blocking error:", error);
  }
};
