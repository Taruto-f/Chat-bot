import {
	type ClientConfig,
	type MessageAPIResponseBase,
	messagingApi,
	middleware,
	type MiddlewareConfig,
	type webhook,
	HTTPFetchError,
	type TextMessage,
} from "@line/bot-sdk";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import admin from "firebase-admin";
import { getDatabase, type Reference } from "firebase-admin/database";
import { defaultConfig, type Config } from "./config";
import { get } from "./db";
import { getWeatherForecast } from "./weather";
import { getEarthquakeInfo } from "./earthquake";
import { GoogleGenerativeAI } from "@google/generative-ai";

// LINE Bot の設定
const serviceAccount: Record<string, string> = JSON.parse(
	process.env.FIREBASE_ADMIN ?? "{}",
);
const clientConfig: ClientConfig = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN ?? "",
};

const middlewareConfig: MiddlewareConfig = {
	channelSecret: process.env.CHANNEL_SECRET ?? "",
};
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: process.env.FIREBASE_DATABASE,
});

const PORT = process.env.PORT ?? 3000;

//gemini
// const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// LINE SDK クライアントの作成
const client = new messagingApi.MessagingApiClient(clientConfig);

const db = getDatabase();

// Express アプリの作成
const app: Application = express();

// クイズの問題リストを定数として定義
const QUIZ_QUESTIONS = [
	{
		question: "古代メソポタミア文明で最初に作られた文字は何ですか？",
		answer: "楔形文字",
	},
	{
		question: "古代エジプト文明のナイル川流域で栽培された主な作物は何ですか？",
		answer: "小麦",
	},
	{
		question: "インダス文明の代表的な都市遺跡の1つは何ですか？",
		answer: "モヘンジョダロ",
	},
	{
		question: "中国の黄河文明で生まれた最古の王朝は何ですか？",
		answer: "殷",
	},
	{
		question: "日本の気候は何気候に属していますか？",
		answer: "温帯",
	},
	{
		question:
			"世界の三大宗教とは、キリスト教、イスラム教、そしてもう1つは何ですか？",
		answer: "仏教",
	},
	{
		question: "アフリカ大陸を南北に走る大地溝帯の名前は何ですか？",
		answer: "グレートリフトバレー",
	},
	{
		question: "縄文時代の主な生活様式は何ですか？",
		answer: "狩猟採集",
	},
	{
		question: "弥生時代に伝来した最も重要な技術は何ですか？",
		answer: "稲作",
	},
	{
		question:
			"古墳時代の代表的な前方後円墳である仁徳天皇陵古墳がある都道府県はどこですか？",
		answer: "大阪府",
	},
	{
		question: "飛鳥時代に制定された日本最古の成文法典は何ですか？",
		answer: "大宝律令",
	},
	{
		question: "奈良時代に編纂された日本最古の歴史書は何ですか？",
		answer: "古事記",
	},
	{
		question: "世界の三大穀物は、米、小麦、そしてもう1つは何ですか？",
		answer: "とうもろこし",
	},
	{
		question:
			"日本の四大工業地帯の1つで、京浜工業地帯がある関東地方の2つの都県は何ですか？",
		answer: "東京都と神奈川県",
	},
	{
		question: "世界最大の熱帯雨林はどこにありますか？",
		answer: "アマゾン",
	},
	{
		question:
			"モンスーンの影響を強く受ける地域として知られるアジアの半島は何ですか？",
		answer: "インド半島",
	},
	{
		question:
			"日本の人口が最も集中している三大都市圏の中心となる都市を答えてください。",
		answer: "東京",
	},
	{
		question: "聖徳太子が制定した日本最古の憲法は何ですか？",
		answer: "十七条憲法",
	},
	{
		question: "平安時代に編纂された最初の仮名文学は何ですか？",
		answer: "土佐日記",
	},
	{
		question: "世界で最も標高の高い大陸は何ですか？",
		answer: "南極大陸",
	},
	{
		question: "古代ギリシャの都市国家を何と呼びましたか？",
		answer: "ポリス",
	},
	{
		question: "古代ローマ帝国の最盛期の皇帝は誰ですか？",
		answer: "トラヤヌス",
	},
	{
		question: "シルクロードの東の起点となった中国の都は何ですか？",
		answer: "長安",
	},
	{
		question: "奈良時代に建立された大仏がある寺院は何ですか？",
		answer: "東大寺",
	},
	{
		question: "平安時代に完成した、日本で最古の漢字辞典は何ですか？",
		answer: "新撰字鏡",
	},
	{
		question: "世界最大の砂漠はどこにありますか？",
		answer: "サハラ砂漠",
	},
	{
		question: "日本で最も古い神社とされるのは何ですか？",
		answer: "大神神社",
	},
	{
		question: "世界三大河川の1つで、エジプト文明を育んだ川は何ですか？",
		answer: "ナイル川",
	},
	{
		question: "縄文時代を代表する土器の模様は何ですか？",
		answer: "縄目模様",
	},
	{
		question: "古代中国の四大発明の1つで、紙の発明者とされる人物は誰ですか？",
		answer: "蔡倫",
	},
	{
		question: "日本の気候を特徴づける梅雨は何によってもたらされますか？",
		answer: "梅雨前線",
	},
	{
		question: "世界最大のサンゴ礁は何ですか？",
		answer: "グレートバリアリーフ",
	},
	{
		question: "飛鳥時代に建立された法隆寺は何県にありますか？",
		answer: "奈良県",
	},
	{
		question: "古代エジプトのピラミッドが最も多く建設された王朝は何ですか？",
		answer: "古王国時代",
	},
	{
		question:
			"日本の地形を形作る4つのプレートの1つ、太平洋プレートが接する海溝は何ですか？",
		answer: "日本海溝",
	},
	{
		question: "古代ローマで作られた円形闘技場の代表的な建造物は何ですか？",
		answer: "コロッセウム",
	},
	{
		question: "奈良時代に編纂された日本最古の地理書は何ですか？",
		answer: "風土記",
	},
	{
		question: "世界で最も人口密度が高い大陸はどこですか？",
		answer: "アジア",
	},
	{
		question: "日本の水田農業が本格的に始まったのは何時代からですか？",
		answer: "弥生時代",
	},
	{
		question: "世界遺産に登録されている富士山の標高は何メートルですか？",
		answer: "3776",
	},
];

// 次の問題を取得する関数
const getNextQuestion = () => {
	return Math.floor(Math.random() * QUIZ_QUESTIONS.length);
};

// メッセージタイプの型を定義
type MessageType = {
	type: "text";
	text: string;
	emojis?: Array<{
		index: number;
		productId: string;
		emojiId: string;
	}>;
	quickReply?: {
		items: Array<{
			type: "action";
			action: {
				type: "message";
				label: string;
				text: string;
			};
		}>;
	};
};

// ✅ LINE Bot のメッセージ処理
const textEventHandler = async (
	event: webhook.Event,
	ref: Reference,
): Promise<MessageAPIResponseBase | undefined> => {
	if (event.type === 'message' && event.message.type === 'image') {
		if (!event.replyToken) return;
		await sendMessage(event.replyToken, [{ type: "text", text: "画像を受け取りました！📷" }]);
		return;
	}

	if (event.type === 'message' && event.message.type === 'sticker') {
		if (!event.replyToken) return;
		const stickerId = event.message.stickerId;
		const packageId = event.message.packageId;

		let replyText = 'スタンプを受け取りました！';

		if (packageId === '11537' && stickerId === '52002734') {
			replyText = 'このスタンプ、かわいいですね！💕';
		} else if (packageId === '11538' && stickerId === '51626494') {
			replyText = 'おもしろいスタンプですね！😆';
		}

		await sendMessage(event.replyToken, [
			{ type: "text", text: replyText }
		], "スタンプ応答");
		return;
	}

	if (event.type !== "message" || event.message.type !== "text") {
		return;
	}

	if (!event.replyToken) return;

	const userMessage = event.message.text.trim(); // ユーザーの入力を取得

	// db
	let config: Config = await get(ref);

	async function update(db: Reference, new_config: Partial<Config>) {
		await db.update(new_config);
		config = await get(ref);
	}

	// メッセージ送信関数を定義
	async function sendMessage(
		replyToken: string,
		messages: MessageType[],
		showName?: string,
	) {
		await client.replyMessage({
			replyToken,
			messages: messages.map((msg) => ({
				type: "text",
				text: msg.text,
				emojis: msg.emojis,
				quickReply: msg.quickReply,
				sender: {
					name: showName,
				},
			})),
			notificationDisabled: config.is_silent,
		});
	}

	const splitMessage = userMessage
		.split(/\s|　/)
		.filter((val) => val.length > 0);

	const quizScoreRef = ref.child("user_scores");

	// クイズがアクティブな場合は、クイズ以外の機能を無効化
	if (config.quiz_status && !userMessage.startsWith("クイズ")) {
		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "クイズが進行中です。クイズを終了するには「クイズ終了」と入力してください。",
			},
		]);
		return;
	}

	// やることリストの処理
	if (userMessage === "7" || userMessage === "やることリスト") {
		// クイズがアクティブな場合は、やることリストの操作を無効化
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "やることリストの操作を選択してください：",
				quickReply: {
					items: [
						{
							type: "action",
							action: {
								type: "message",
								label: "表示",
								text: "やることリスト表示",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "追加",
								text: "やることリスト追加",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "削除",
								text: "やることリスト削除",
							},
						},
					],
				},
			},
		]);
		return;
	}

	// やることリストの表示
	if (userMessage === "やることリスト表示") {
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		if (config.todo_list.length === 0) {
			await sendMessage(event.replyToken, [
				{ type: "text", text: "やることリストは空です。" },
			]);
		} else {
			const todoList = config.todo_list
				.map((todo, index) => `${index + 1}. ${todo}`)
				.join("\n");
			await sendMessage(event.replyToken, [
				{ type: "text", text: `【やることリスト】\n${todoList}` },
			]);
		}
		return;
	}

	// やることリストの追加
	if (userMessage === "やることリスト追加") {
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "追加するタスクを入力してください。\n例：やることリスト追加 買い物に行く",
			},
		]);
		return;
	}

	if (userMessage.startsWith("やることリスト追加 ")) {
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		const newTask = userMessage.replace("やることリスト追加 ", "").trim();
		if (newTask === "") {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "タスクの内容を入力してください。\n例：やることリスト追加 買い物に行く",
				},
			]);
			return;
		}

		// やることリストが未定義の場合は空配列で初期化
		if (!config.todo_list) {
			await update(ref, { todo_list: [] });
		}

		const updatedList = [...(config.todo_list || []), newTask];
		await update(ref, { todo_list: updatedList });
		await sendMessage(event.replyToken, [
			{ type: "text", text: `タスク「${newTask}」を追加しました。` },
		]);
		return;
	}

	// やることリストの削除
	if (userMessage === "やることリスト削除") {
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		if (config.todo_list.length === 0) {
			await sendMessage(event.replyToken, [
				{ type: "text", text: "やることリストは空です。" },
			]);
		} else {
			const todoList = config.todo_list
				.map((todo, index) => `${index + 1}. ${todo}`)
				.join("\n");
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: `削除するタスクの番号を入力してください。\n\n【やることリスト】\n${todoList}`,
				},
			]);
		}
		return;
	}

	if (userMessage.startsWith("やることリスト削除 ")) {
		if (config.quiz_status) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズが進行中です。やることリストの操作は、クイズを終了してから行ってください。",
				},
			]);
			return;
		}

		const taskNumber = Number.parseInt(
			userMessage.replace("やることリスト削除 ", "").trim(),
		);
		if (
			Number.isNaN(taskNumber) ||
			taskNumber < 1 ||
			taskNumber > config.todo_list.length
		) {
			await sendMessage(event.replyToken, [
				{ type: "text", text: "正しいタスク番号を入力してください。" },
			]);
		} else {
			const deletedTask = config.todo_list[taskNumber - 1];
			const updatedList = config.todo_list.filter(
				(_, index) => index !== taskNumber - 1,
			);
			await update(ref, { todo_list: updatedList });
			await sendMessage(event.replyToken, [
				{ type: "text", text: `タスク「${deletedTask}」を削除しました。` },
			]);
		}
		return;
	}

	// クイズの処理
	if (userMessage === "2" || userMessage === "クイズ") {
		const userId = event.source?.userId || "anonymous";
		await update(ref, { quiz_status: true });

		// クイズ開始時にスコアを0にリセット
		await update(quizScoreRef, {
			[userId]: 0,
		});

		// 最初の問題を表示
		const firstQuestionId = getNextQuestion();
		await update(ref, {
			current_question: firstQuestionId,
		});
		const firstQuestion = QUIZ_QUESTIONS[firstQuestionId];

		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "クイズを開始します！スコアは0点にリセットされました。",
			},
			{ type: "text", text: firstQuestion.question },
			{ type: "text", text: "答えを入力してください！" },
		]);
		return;
	}

	// クイズの回答処理
	if (config.quiz_status) {
		const userId = event.source?.userId ?? "anonymous";
		const currentQuestion = QUIZ_QUESTIONS[config.current_question];
		const userAnswer = userMessage.trim();
		const nextQuestionId = getNextQuestion();
		await update(ref, { current_question: nextQuestionId });
		const nextQuestion = QUIZ_QUESTIONS[nextQuestionId];
		const nextQuestionMessage: MessageType[] = [
			{ type: "text", text: "次の問題です！" },
			{ type: "text", text: `Q. ${nextQuestion.question}` },
			{ type: "text", text: "答えを入力してください！" },
		];

		// スコアが未定義の場合は0で初期化
		if (config.user_scores[userId] === undefined) {
			await update(quizScoreRef, {
				[userId]: 0,
			});
		}

		if (userAnswer === currentQuestion.answer) {
			await update(quizScoreRef, {
				[userId]: (config.user_scores[userId] ?? 0) + 10,
			});
			await sendMessage(event.replyToken, [
				{ type: "text", text: "正解です！" },
				{
					type: "text",
					text: `+10点！ 現在のスコア: ${config.user_scores[userId]}点`,
				},
				...nextQuestionMessage,
			]);
		} else {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: `残念ながら不正解です。\n正解は「${currentQuestion.answer}」でした。`,
				},
				{
					type: "text",
					text: `現在のスコア: ${config.user_scores[userId]}点`,
				},
				...nextQuestionMessage,
			]);
		}
		return;
	}

	// クイズ終了
	if (userMessage === "クイズ終了") {
		const userId = event.source?.userId ?? "anonymous";
		await update(ref, { quiz_status: false });
		await sendMessage(event.replyToken, [
			{ type: "text", text: "クイズを終了しました！" },
		]);
		return;
	}

	if (userMessage === "判定") {
		const result = Math.random() < 0.5 ? "Yes" : "No";
		await sendMessage(event.replyToken, [{ type: "text", text: result }]);
	} else if (userMessage === "数字") {
		await sendMessage(event.replyToken, [
			{ type: "text", text: String(Math.random()) },
		]);
	} else if (/ありがとう/.test(userMessage)) {
		await sendMessage(event.replyToken, [
			{ type: "text", text: "どういたしまして" },
		]);
	} else if (/さようなら/.test(userMessage)) {
		await sendMessage(event.replyToken, [{ type: "text", text: "またね" }]);
	} else if (/おはよう/.test(userMessage)) {
		await sendMessage(event.replyToken, [{ type: "text", text: "おはよう" }]);
	} else if (/こんにちは/.test(userMessage)) {
		await sendMessage(event.replyToken, [{ type: "text", text: "こんにちは" }]);
	} else if (/こんばんは/.test(userMessage)) {
		await sendMessage(event.replyToken, [{ type: "text", text: "こんばんは" }]);
	} else if (userMessage === "占い") {
		const fortunes = [
			"今日はとても良い日になりそうです！",
			"新しいことに挑戦するのに良い日です。",
			"慎重に行動することをお勧めします。",
			"思いがけない幸運が訪れるかもしれません。",
			"周りの人との協力が大切な日です。",
		];
		const luckyColors = ["赤", "青", "緑", "黄", "紫", "ピンク", "オレンジ"];
		const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
		const luckyColor =
			luckyColors[Math.floor(Math.random() * luckyColors.length)];
		await sendMessage(event.replyToken, [
			{ type: "text", text: `今日の運勢：${fortune}` },
			{ type: "text", text: `ラッキーカラー：${luckyColor}` },
		]);
	} else if (userMessage === "クイズ") {
		const userId = event.source?.userId || "anonymous";
		await update(ref, { quiz_status: true });

		// クイズ開始時にスコアを0にリセット
		await update(quizScoreRef, {
			[userId]: 0,
		});

		// 最初の問題を表示
		const firstQuestionId = getNextQuestion();
		await update(ref, {
			current_question: firstQuestionId,
		});
		const firstQuestion = QUIZ_QUESTIONS[firstQuestionId];

		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "クイズを開始します！スコアは0点にリセットされました。",
			},
			{ type: "text", text: firstQuestion.question },
			{ type: "text", text: "答えを入力してください！" },
		]);
	} else if (userMessage === "次のクイズ") {
		if (config.quiz_status) {
			const nextQuestionId = getNextQuestion();
			await update(ref, { current_question: nextQuestionId });
			const nextQuestion = QUIZ_QUESTIONS[nextQuestionId];

			await sendMessage(event.replyToken, [
				{ type: "text", text: "次の問題です！" },
				{ type: "text", text: `Q. ${nextQuestion.question}` },
				{ type: "text", text: "答えを入力してください！" },
			]);
		} else {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "クイズを開始するには「クイズ」と入力してください。",
				},
			]);
		}
	} else if (userMessage.startsWith("ANSWER:")) {
		// これは内部処理用のメッセージなので無視
		return;
	} else if (userMessage === "スコア") {
		const userId = event.source?.userId || "anonymous";
		// スコアが未定義の場合は0で初期化
		if (config.user_scores[userId] === undefined) {
			await update(quizScoreRef, {
				[userId]: 0,
			});
		}
		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: `あなたの現在のスコアは ${config.user_scores[userId]} 点です！`,
			},
		]);
	} else if (userMessage === "リセット") {
		const userId = event.source?.userId ?? "anonymous";
		await update(quizScoreRef, {
			[userId]: 0,
		});
		await sendMessage(event.replyToken, [
			{ type: "text", text: "スコアをリセットしました！" },
		]);
	} else if (userMessage === "!!db") {
		// デバッグ用　データベース出力
		const json = JSON.stringify(await get(ref));
		await sendMessage(
			event.replyToken,
			[{ type: "text", text: json }],
			"DB Show for Admin",
		);
	} else if (userMessage === "1" || userMessage === "天気") {
		try {
			const forecast = await getWeatherForecast(config.weather_zone);
			await sendMessage(
				event.replyToken,
				[
					{ type: "text", text: `【${forecast.targetArea}の天気予報】` },
					{ type: "text", text: forecast.text },
					{
						type: "text",
						text: `発表時刻: ${new Date(forecast.reportDatetime).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}(日本時間)\n発表者: ${forecast.publishingOffice}`,
					},
				],
				"天気情報",
			);
		} catch (error) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "申し訳ありません。天気予報の取得に失敗しました。\n天気ゾーンなどの設定をご確認ください。",
				},
			]);
		}
	} else if (splitMessage[0] === "天気ゾーン") {
		if (splitMessage.length === 1) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "「天気ゾーン (ゾーン番号)」と入力することで天気ゾーンを設定できます。\n天気ゾーン一覧はこちら: https://x.gd/lhdUU",
				},
				{ type: "text", text: `現在の天気ゾーン: ${config.weather_zone}` },
			]);
		} else {
			const zone = splitMessage[1];
			if (/\d{6}/.test(zone)) {
				try {
					const weather = await getWeatherForecast(zone);
					await update(ref, { weather_zone: zone });
					await sendMessage(event.replyToken, [
						{ type: "text", text: `天気ゾーンを${zone}に設定しました。` },
						{
							type: "text",
							text: `地域: ${weather.targetArea}\n発表者: ${weather.publishingOffice}`,
						},
					]);
				} catch (error) {
					await sendMessage(event.replyToken, [
						{
							type: "text",
							text: "天気ゾーンが正しく入力されていません。\n「天気ゾーン (ゾーン番号)」と入力してください。\nゾーン番号は6桁の半角数字です。",
						},
					]);
				}
			}
		}
	} else if (userMessage === "通知オン") {
		await update(ref, { is_silent: false });
		await sendMessage(event.replyToken, [
			{ type: "text", text: "通知を有効にしました。" },
		]);
	} else if (userMessage === "通知オフ") {
		await update(ref, { is_silent: true });
		await sendMessage(event.replyToken, [
			{ type: "text", text: "通知を無効にしました。" },
		]);
	} else if (userMessage === "機能一覧") {
		await sendMessage(event.replyToken, [
			{
				type: "text",
				text:
					"以下の機能が利用できます：\n\n" +
					"1. 天気予報\n" +
					"2. クイズ\n" +
					"3. 占い\n" +
					"4. 挨拶\n" +
					"5. AI質問\n" +
					"6. 地震情報\n" +
					"7. やることリスト\n\n" +
					"各機能を使用するには、番号を入力するか、以下のボタンから選択してください。",
				quickReply: {
					items: [
						{
							type: "action",
							action: {
								type: "message",
								label: "天気予報",
								text: "天気",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "クイズ",
								text: "クイズ",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "占い",
								text: "占い",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "挨拶",
								text: "挨拶",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "質問",
								text: "質問",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "地震情報",
								text: "地震",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "やることリスト",
								text: "やることリスト",
							},
						},
					],
				},
			},
		]);
	} else if (userMessage === "3" || userMessage === "占い") {
		const fortunes = [
			"今日はとても良い日になりそうです！",
			"新しいことに挑戦するのに良い日です。",
			"慎重に行動することをお勧めします。",
			"思いがけない幸運が訪れるかもしれません。",
			"周りの人との協力が大切な日です。",
		];
		const luckyColors = ["赤", "青", "緑", "黄", "紫", "ピンク", "オレンジ"];
		const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
		const luckyColor =
			luckyColors[Math.floor(Math.random() * luckyColors.length)];
		await sendMessage(
			event.replyToken,
			[
				{ type: "text", text: `今日の運勢：${fortune}` },
				{ type: "text", text: `ラッキーカラー：${luckyColor}` },
			],
			"占い",
		);
	} else if (userMessage === "4" || userMessage === "挨拶") {
		await sendMessage(event.replyToken, [
			{
				type: "text",
				text: "以下のボタンから挨拶を選択してください。",
				quickReply: {
					items: [
						{
							type: "action",
							action: {
								type: "message",
								label: "ありがとう",
								text: "ありがとう",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "さようなら",
								text: "さようなら",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "おはよう",
								text: "おはよう",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "こんにちは",
								text: "こんにちは",
							},
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "こんばんは",
								text: "こんばんは",
							},
						},
					],
				},
			},
		]);
	} else if (userMessage === "5" || userMessage === "質問") {
		await sendMessage(event.replyToken, [
			{ type: "text", text: "末尾に「？」を付けて質問してね" },
		]);
	} else if (userMessage === "6" || userMessage === "地震") {
		try {
			const earthquakeData = await getEarthquakeInfo();
			const message = `【最新の地震情報】
			\n
			=========================
			発生時刻: ${earthquakeData.time}
			震源地: ${earthquakeData.location}
			最大震度: ${earthquakeData.intensity}
			深さ: ${earthquakeData.depth}km
			マグニチュード: ${earthquakeData.magnitude}
			=========================
			`;
			await sendMessage(
				event.replyToken,
				[{ type: "text", text: message }],
				"地震情報",
			);
		} catch (error) {
			await sendMessage(event.replyToken, [
				{
					type: "text",
					text: "申し訳ありません。地震情報の取得に失敗しました。",
				},
			]);
		}
	} else {
		const userId = event.source?.userId ?? "anonymous";

		// クイズがアクティブな場合のみ答えをチェック!
		if (config.quiz_status) {
			const currentQuestion = QUIZ_QUESTIONS[config.current_question];
			const userAnswer = userMessage.trim();
			const nextQuestionId = getNextQuestion();
			await update(ref, { current_question: nextQuestionId });
			const nextQuestion = QUIZ_QUESTIONS[nextQuestionId];
			const nextQuestionMessage: MessageType[] = [
				{ type: "text", text: "次の問題です！" },
				{ type: "text", text: `Q. ${nextQuestion.question}` },
				{ type: "text", text: "答えを入力してください！" },
			];

			// スコアが未定義の場合は0で初期化
			if (config.user_scores[userId] === undefined) {
				await update(quizScoreRef, {
					[userId]: 0,
				});
			}

			if (userAnswer === currentQuestion.answer) {
				await update(quizScoreRef, {
					[userId]: (config.user_scores[userId] ?? 0) + 10,
				});
				await sendMessage(event.replyToken, [
					{ type: "text", text: "正解です！" },
					{
						type: "text",
						text: `+10点！ 現在のスコア: ${config.user_scores[userId]}点`,
					},
					...nextQuestionMessage,
				]);
			} else {
				await sendMessage(event.replyToken, [
					{
						type: "text",
						text: `残念ながら不正解です。\n正解は「${currentQuestion.answer}」でした。`,
					},
					{
						type: "text",
						text: `現在のスコア: ${config.user_scores[userId]}点`,
					},
					...nextQuestionMessage,
				]);
			}
		} else if (userMessage.endsWith("?") || userMessage.endsWith("？")) {
			const result = await model.generateContent(userMessage);
			const response = await result.response;
			const text = response.text();
			await sendMessage(
				event.replyToken,
				[{ type: "text", text }],
				"AIチャット",
			);
		} else {
			if (event.source?.type === "user") {
				await sendMessage(event.replyToken, [
					{
						type: "text",
						text: "申し訳ありません。そのコマンドは認識できませんでした。\n「機能一覧」と入力して利用可能な機能を確認してください。",
					},
				]);
			}
		}
	}
};

// ✅ Webhookのエンドポイント
app.post(
	"/webhook",
	middleware(middlewareConfig),
	async (req: Request, res: Response): Promise<void> => {
		const callbackRequest: webhook.CallbackRequest = req.body;
		const events: webhook.Event[] = callbackRequest.events || [];
		const ref = db.ref("data");

		const results = await Promise.all(
			events.map(async (event: webhook.Event) => {
				try {
					const child = (() => {
						if (event.source?.type === "group") {
							return ref.child(`group/${event.source.groupId}`);
						}
						if (event.source?.type === "room") {
							return ref.child(`room/${event.source.roomId}`);
						}
						if (event.source?.type === "user") {
							return ref.child(`user/${event.source.userId}`);
						}
					})();

					if (child === undefined) {
						throw new Error("child is undefined");
					}

					const config: Config = await get(child);
					await child.set(Object.assign({}, defaultConfig, config));

					await textEventHandler(event, child);
				} catch (err: unknown) {
					if (err instanceof HTTPFetchError) {
						console.error(err.status);
						console.error(err.headers.get("x-line-request-id"));
						console.error(err.body);
					} else if (err instanceof Error) {
						console.error(err);
					}

					return res.status(500).json({ status: "error" });
				}
			}),
		);

		res.status(200).json({ status: "success", results });
	},
);

// ✅ サーバー起動
app.listen(PORT, () => {
	console.log(`Application is live and listening on port ${PORT}`);
});
