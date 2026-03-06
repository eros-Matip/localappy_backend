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
  const date = getTodayDateString();

  const normalizedCity = city?.trim();

  if (!normalizedCity) return;

  let stat = await DailyCityConsultationStat.findOne({
    date,
    city: normalizedCity,
  });

  if (!stat) {
    stat = new DailyCityConsultationStat({
      date,
      city: normalizedCity,
      totalConsultations: 0,
    });
  }

  stat.totalConsultations += 1;

  await stat.save();
};
