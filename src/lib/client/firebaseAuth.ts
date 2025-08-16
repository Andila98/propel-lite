
import { getAuth } from "firebase/auth";
import { app } from "../firebase/client-app";

export async function getIdToken(): Promise<string> {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated.");
    }
    return user.getIdToken();
}
