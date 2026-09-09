variable "function_name" {
  type = string
}

variable "source_dir" {
  type = string
}

variable "dlq_arn" {
  type = string
}

variable "dlq_url" {
  type = string
}

variable "main_queue_arn" {
  type = string
}

variable "main_queue_url" {
  type = string
}

variable "max_messages_per_invocation" {
  type    = number
  default = 10

  validation {
    condition     = var.max_messages_per_invocation > 0
    error_message = "max_messages_per_invocation must be greater than zero."
  }
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
  default = 60
}

variable "archive_excludes" {
  type    = list(string)
  default = []
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
