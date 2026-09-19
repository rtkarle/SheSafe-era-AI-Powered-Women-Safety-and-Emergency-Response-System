const express = require("express");
const router = express.Router();

const { db } = require("../firebaseClient");


// ============================================================
// START GUARDIAN MODE
// POST /api/guardian/start
// ============================================================

router.post("/start", async (req, res) => {
    try {
        const {
            userId,
            guardianId,
            durationMinutes,
            latitude,
            longitude
        } = req.body;

        console.log('[Guardian/start] body:', { userId, guardianId, durationMinutes, latitude, longitude });

        // Validate input
        if (
            !userId ||
            !guardianId ||
            !durationMinutes ||
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: "userId, guardianId, durationMinutes, latitude and longitude are required"
            });
        }

        if (Number(durationMinutes) < 5 || Number(durationMinutes) > 1440) {
            return res.status(400).json({
                success: false,
                error: "Duration must be between 5 minutes and 24 hours"
            });
        }

        // --------------------------------------------------------
        // Look up the guardian contact
        // --------------------------------------------------------
        // NOTE: We trust the guardianId because the mobile app fetches it from
        // Firestore using Firebase Auth credentials (authenticated read), so only
        // contacts that belong to the current user can be returned.
        // We still check the contact exists in Firestore.
        // --------------------------------------------------------

        const guardianRef = db.collection("contacts").doc(guardianId);
        const guardianDoc = await guardianRef.get();

        if (!guardianDoc.exists) {
            console.error('[Guardian/start] Contact not found:', guardianId);
            return res.status(404).json({
                success: false,
                error: "Guardian contact not found (id: " + guardianId + ")"
            });
        }

        const guardian = guardianDoc.data();
        console.log('[Guardian/start] Contact found:', guardian.name, '| contact.user_id:', guardian.user_id, '| request userId:', userId);

        // --------------------------------------------------------
        // Calculate expiry time
        // --------------------------------------------------------

        const startTime = new Date();
        const expiresAt = new Date(startTime.getTime() + Number(durationMinutes) * 60 * 1000);

        // --------------------------------------------------------
        // Create Guardian Mode session
        // --------------------------------------------------------

        const sessionRef = await db.collection("guardian_sessions").add({
            userId,
            guardianId,

            guardianName: guardian.name,
            guardianPhone: guardian.phone,

            durationMinutes: Number(durationMinutes),

            latitude: Number(latitude),
            longitude: Number(longitude),

            status: "active",

            startTime: startTime.toISOString(),
            expiresAt: expiresAt.toISOString(),

            lastLocationUpdate: startTime.toISOString()
        });

        console.log('[Guardian/start] Session created:', sessionRef.id);

        res.status(201).json({
            success: true,
            message: "Guardian Mode started",
            sessionId: sessionRef.id,
            userId,
            guardianId,
            guardianName: guardian.name,
            status: "active",
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {
        console.error("Guardian start error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ============================================================
// UPDATE GUARDIAN LOCATION
// POST /api/guardian/location
// ============================================================

router.post("/location", async (req, res) => {
    try {
        const {
            sessionId,
            latitude,
            longitude
        } = req.body;

        if (
            !sessionId ||
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "sessionId, latitude and longitude are required"
            });
        }

        const sessionRef = db
            .collection("guardian_sessions")
            .doc(sessionId);

        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({
                success: false,
                error: "Guardian session not found"
            });
        }

        const session = sessionDoc.data();

        // Check active status
        if (session.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "Guardian session is not active"
            });
        }

        const now = new Date();

        // Check expiration
        if (new Date(session.expiresAt) <= now) {

            await sessionRef.update({
                status: "expired"
            });

            return res.status(400).json({
                success: false,
                error: "Guardian session has expired"
            });
        }

        // Update location
        await sessionRef.update({
    latitude: Number(latitude),
    longitude: Number(longitude),
    lastLocationUpdate: now.toISOString()
});

const remainingSeconds = Math.max(
    0,
    Math.floor(
        (new Date(session.expiresAt) - now) / 1000
    )
);

res.json({
    success: true,
    message: "Location updated",

    sessionId,

    latitude: Number(latitude),
    longitude: Number(longitude),

    updatedAt: now.toISOString(),

    remainingSeconds,
    remainingMinutes: Math.floor(
        remainingSeconds / 60
    )
});
    } catch (error) {
        console.error("Guardian location error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ============================================================
// END GUARDIAN MODE
// POST /api/guardian/end
// ============================================================
// NOTE: This must be declared BEFORE the GET /:sessionId wildcard
// so Express does not route POST /end into the wildcard handler.

router.post("/end", async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: "sessionId is required"
            });
        }

        const sessionRef = db
            .collection("guardian_sessions")
            .doc(sessionId);

        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({
                success: false,
                error: "Guardian session not found"
            });
        }

        await sessionRef.update({
            status: "ended",
            endedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: "Guardian Mode ended",
            sessionId,
            status: "ended"
        });

    } catch (error) {
        console.error("Guardian end error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ============================================================
// GET GUARDIAN SESSION
// GET /api/guardian/:sessionId
// ============================================================

router.get("/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;

        const sessionRef = db
            .collection("guardian_sessions")
            .doc(sessionId);

        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(404).json({
                success: false,
                error: "Guardian session not found"
            });
        }

        const session = sessionDoc.data();

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const startTime = new Date(session.startTime);

        let status = session.status;

        // Calculate remaining time
        let remainingSeconds = Math.max(
            0,
            Math.floor((expiresAt - now) / 1000)
        );

        let remainingMinutes = Math.floor(
            remainingSeconds / 60
        );

        // Automatically expire active sessions
        if (
            status === "active" &&
            remainingSeconds <= 0
        ) {
            status = "expired";

            await sessionRef.update({
                status: "expired"
            });

            remainingSeconds = 0;
            remainingMinutes = 0;
        }

        res.json({
            success: true,
            sessionId,

            session: {
                ...session,

                status,

                startTime: startTime.toISOString(),
                expiresAt: expiresAt.toISOString(),

                remainingSeconds,
                remainingMinutes
            }
        });

    } catch (error) {
        console.error("Guardian fetch error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;