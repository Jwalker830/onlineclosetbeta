import React from 'react';
import axios from 'axios';

const AutoTag = ({ onAutoTag, item }) => {
    const handleAutoTag = async () => {
        try {
            // Create a payload with the image URL
            const payload = {
                imageUrl: item.imgURL  // Assuming item.imgURL holds the Firebase URL
            };

            // Send POST request to your backend API for auto-tagging
            const response = await axios.post(process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8080/auto-tag', payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Handle the response to retrieve tags
            if (response.data.success) {
                const { tags } = response.data;
                console.log("Tags:", tags);
                onAutoTag(tags);  // Call the onAutoTag function with the retrieved tags
            } else {
                console.error("Auto-tagging failed:", response.data.error);
            }
        } catch (error) {
            console.error("Error during auto-tagging:", error);
        }
    };

    return (
        <button onClick={handleAutoTag} className="auto-tag-button">
            AUTO TAG
        </button>
    );
};

export default AutoTag;