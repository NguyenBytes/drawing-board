variable "name" {
  type = string
}

variable "create_dlq" {
  type    = bool
  default = true
}

variable "visibility_timeout_seconds" {
  type    = number
  default = 180
}

variable "message_retention_seconds" {
  type    = number
  default = 345600
}

variable "receive_wait_time_seconds" {
  type    = number
  default = 10
}

variable "max_receive_count" {
  type    = number
  default = 5
}

variable "tags" {
  type    = map(string)
  default = {}
}
