const LINKEDIN_API_URL = "https://api.linkedin.com";

function getHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": "202401",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

/**
 * Upload an image to LinkedIn and return the image URN.
 * Uses the LinkedIn Images API (initialize upload + PUT binary).
 */
export async function uploadImage(
  accessToken: string,
  memberUrn: string,
  imageBuffer: Buffer
): Promise<string> {
  // Step 1: Initialize upload
  const initResponse = await fetch(
    `${LINKEDIN_API_URL}/rest/images?action=initializeUpload`,
    {
      method: "POST",
      headers: getHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: memberUrn,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`LinkedIn image upload init failed: ${initResponse.status} ${error}`);
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.value.uploadUrl;
  const imageUrn = initData.value.image;

  // Step 2: Upload the binary image
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`LinkedIn image binary upload failed: ${uploadResponse.status} ${error}`);
  }

  return imageUrn;
}

/**
 * Create a text-only LinkedIn post. Returns the post URN.
 */
export async function createTextPost(
  accessToken: string,
  memberUrn: string,
  text: string
): Promise<string> {
  const response = await fetch(`${LINKEDIN_API_URL}/rest/posts`, {
    method: "POST",
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      author: memberUrn,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn text post creation failed: ${response.status} ${error}`);
  }

  // The post URN is returned in the x-restli-id header
  const postUrn = response.headers.get("x-restli-id");
  if (!postUrn) {
    throw new Error("LinkedIn did not return a post URN");
  }

  return postUrn;
}

/**
 * Create a LinkedIn post with an image. Returns the post URN.
 */
export async function createImagePost(
  accessToken: string,
  memberUrn: string,
  text: string,
  imageUrn: string
): Promise<string> {
  const response = await fetch(`${LINKEDIN_API_URL}/rest/posts`, {
    method: "POST",
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      author: memberUrn,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: imageUrn,
        },
      },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn image post creation failed: ${response.status} ${error}`);
  }

  const postUrn = response.headers.get("x-restli-id");
  if (!postUrn) {
    throw new Error("LinkedIn did not return a post URN");
  }

  return postUrn;
}
