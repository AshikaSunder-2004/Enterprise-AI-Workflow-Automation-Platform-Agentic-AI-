export declare const config: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    GEMINI_API_KEY: string;
    ENCRYPTION_KEY: string;
    FRONTEND_URL: string;
    SLACK_CLIENT_ID?: string | undefined;
    SLACK_CLIENT_SECRET?: string | undefined;
    GMAIL_CLIENT_ID?: string | undefined;
    GMAIL_CLIENT_SECRET?: string | undefined;
    JIRA_HOST?: string | undefined;
    SERPER_API_KEY?: string | undefined;
    WORKER_MODE?: string | undefined;
};
export type Config = typeof config;
//# sourceMappingURL=env.d.ts.map