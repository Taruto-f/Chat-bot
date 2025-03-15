import axios from "axios";

// 天気予報データの型定義
export interface WeatherForecast {
	publishingOffice: string;
	reportDatetime: string;
	targetArea: string;
	headlineText: string;
	text: string;
}

// 天気予報を取得する関数
export async function getWeatherForecast(
	zone: string,
): Promise<WeatherForecast> {
	const response = await axios.get<WeatherForecast>(
		`https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${zone}.json`,
		{
			headers: {
				"User-Agent": "WeatherBot/1.0",
			},
		},
	);
	return response.data;
}
