export interface AnswerRequest {
  question: string;
  username: string;
}

export interface AnswerProvider {
  readonly name: string;
  answer(request: AnswerRequest): Promise<string>;
}
