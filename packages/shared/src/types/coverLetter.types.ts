// Mirror of frontend src/types/coverLetter.types.ts

export interface CoverLetterData {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  recipientName: string
  recipientTitle: string
  /** Name after "Dear"; empty falls back to `recipientName`, then "Hiring Manager". */
  salutation: string
  companyName: string
  companyAddress: string
  opening: string
  bodyWhy: string
  bodyBring: string
  closing: string
  targetJobDescription: string
  signature: string
  meta: {
    createdAt: string
    updatedAt: string
    version: string
  }
}
