/**
 * Test script for dynamic gesture generation
 * Tests the new LLM-driven gesture system
 */

const testQueries = [
    {
        name: "False Greeting Test (Machine Learning)",
        message: "Bagaimana cara kerja machine learning?",
        // Should NOT be Greeting despite containing 'hi'
        forbiddenGestures: ["Greeting"]
    },
    {
        name: "Long Dissertation Explanation",
        message: "Jelaskan sejarah perkembangan AI dari masa ke masa dengan sangat detail untuk disertasi saya",
        expectedMinGestures: 4 // Should be a long sequence
    },
    {
        name: "Real Greeting Test",
        message: "Halo, selamat pagi bu guru",
        expectedGestures: ["Greeting"]
    }
];

async function testGestureGeneration() {
    console.log("🧪 Testing Dynamic Gesture Generation System\n");
    console.log("=".repeat(60));

    const backendUrl = "http://localhost:3000";

    for (const test of testQueries) {
        console.log(`\n📝 Test: ${test.name}`);
        console.log(`   Query: "${test.message}"`);

        try {
            const response = await fetch(`${backendUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: test.message })
            });

            if (!response.ok) {
                console.log(`   ❌ HTTP Error: ${response.status}`);
                continue;
            }

            const data = await response.json();

            if (!data.success) {
                console.log(`   ❌ Backend Error: ${data.message}`);
                continue;
            }

            console.log(`   ✅ Response received`);
            console.log(`   📊 Gestures: ${JSON.stringify(data.gestureLabels)}`);
            console.log(`   💬 Text preview: "${data.text.substring(0, 100)}..."`);
            console.log(`   🎵 Audio duration: ${data.audioDuration}s`);

            // Validate expectations
            if (test.expectedGestures) {
                const hasExpected = test.expectedGestures.some(g =>
                    data.gestureLabels.includes(g)
                );
                if (hasExpected) {
                    console.log(`   ✅ Contains expected gesture`);
                } else {
                    console.log(`   ⚠️  Expected one of: ${test.expectedGestures.join(", ")}`);
                }
            }

            if (test.forbiddenGestures) {
                const hasForbidden = test.forbiddenGestures.some(g =>
                    data.gestureLabels.includes(g)
                );
                if (!hasForbidden) {
                    console.log(`   ✅ No forbidden gestures detected`);
                } else {
                    console.log(`   ❌ Detected forbidden gesture: ${test.forbiddenGestures.filter(g => data.gestureLabels.includes(g))}`);
                }
            }

            if (test.expectedMinGestures) {
                if (data.gestureLabels.length >= test.expectedMinGestures) {
                    console.log(`   ✅ Has ${data.gestureLabels.length} gestures (min: ${test.expectedMinGestures})`);
                } else {
                    console.log(`   ⚠️  Only ${data.gestureLabels.length} gestures (expected min: ${test.expectedMinGestures})`);
                }
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Wait between requests to avoid overwhelming the backend
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Testing complete!\n");
}

// Run the tests
testGestureGeneration().catch(console.error);
