import dotenv from "dotenv";

dotenv.config();

interface TConfigData {
    EXPRESS: {
        PORT: number;
    }
    GOOGLE: {
        CLIENT_ID: string;
        CLIENT_SECRET: string;
        REDIRECT_URI: string;
    }
}

const CONFIG: TConfigData = {
    EXPRESS: {
        PORT: Number(process.env.EXPRESS_PORT)
    },
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || ''
    }
}

export default CONFIG;