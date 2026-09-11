import { AppError, parseCommand, toErrorResponse } from '../../../packages/contracts/src/index';
/** Build-only stub: no identity, database or external effects until P0-03. */
export async function main(event: unknown) {
  let requestId = 'invalid-request';
  try {
    const command = parseCommand(event); requestId = command.requestId;
    throw new AppError('NOT_READY');
  } catch (error) { return toErrorResponse(requestId, error); }
}
