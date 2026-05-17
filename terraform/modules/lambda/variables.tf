variable "function_name" {
  type = string
}

variable "source_file" {
  type = string
}

variable "dependencies_path" {
  type    = string
  default = ""
}

variable "package_json_path" {
  type    = string
  default = ""
}

variable "package_lock_path" {
  type    = string
  default = ""
}

variable "extra_file_paths" {
  type    = list(string)
  default = []
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "memory_size" {
  type    = number
  default = 128
}

variable "timeout" {
  type    = number
  default = 30
}

variable "queue_arn" {
  type    = string
  default = null
}

variable "enable_sqs_trigger" {
  type    = bool
  default = false
}

variable "batch_size" {
  type    = number
  default = 10
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
