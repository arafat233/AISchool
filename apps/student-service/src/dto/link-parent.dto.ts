import { IsString } from "class-validator";
export class LinkParentDto { @IsString() parentUserId!: string; }
