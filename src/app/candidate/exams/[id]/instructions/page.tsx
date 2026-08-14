import InstructionsClient from "./InstructionsClient";

export const metadata = {
  title: "Exam Instructions - MockExam Portal",
};

interface InstructionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructionsPage({ params }: InstructionsPageProps) {
  const { id } = await params;
  return <InstructionsClient examId={id} />;
}
