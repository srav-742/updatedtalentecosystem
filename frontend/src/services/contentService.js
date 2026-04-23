import { API_URL, getAuthHeaders } from "../firebase";
const BASE_URL = `${API_URL}/content`;


export const getAllContent = async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(BASE_URL, { headers });
    return res.json();
};

export const generateContent = async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/generate`, {
        method: "POST",
        headers
    });
    return res.json();
};

export const markAsPosted = async (id) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PATCH",
        headers
    });
    return res.json();
};

export const regenerateContent = async (id) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/${id}/regenerate`, {
        method: "POST",
        headers
    });
    return res.json();
};

