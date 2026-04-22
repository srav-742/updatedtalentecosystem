import { API_URL } from "../firebase";
const BASE_URL = `${API_URL}/content`;

export const getAllContent = async () => {
    const res = await fetch(BASE_URL);
    return res.json();
};

export const generateContent = async () => {
    const res = await fetch(`${BASE_URL}/generate`, {
        method: "POST",
    });
    return res.json();
};

export const markAsPosted = async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PATCH",
    });
    return res.json();
};

export const regenerateContent = async (id) => {
    const res = await fetch(`${BASE_URL}/${id}/regenerate`, {
        method: "POST",
    });
    return res.json();
};
