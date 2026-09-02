export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const studentId = String(
    req.query?.student_id ||
      req.query?.id ||
      ""
  )
    .trim()
    .slice(0, 100);

  if (!studentId) {
    return res.status(400).json({
      error: "student_id is required."
    });
  }

  const student = {
    student_id: studentId,
    name:
      studentId.toUpperCase() === "TEST123"
        ? "Test Student"
        : "Student",
    course: "General Studies",
    status: "active"
  };

  return res.status(200).json({
    success: true,
    student
  });
}
