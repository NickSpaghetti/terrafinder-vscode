import Module from "module"
import { Terraform } from "./terraform"

export type HclFile = {
    terraform:Terraform[]
    module?: Map<string,Module[]>
}