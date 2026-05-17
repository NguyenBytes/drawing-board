variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "project_name" {
  type    = string
  default = "drawing-board"
}

variable "username" {
  type      = string
  sensitive = true
}

variable "password" {
  type      = string
  sensitive = true
}

variable "host" {
  type = string
}

variable "port" {
  type    = string
  default = "3306"
}

variable "database" {
  type = string
}

variable "sslmode" {
  type    = string
  default = "REQUIRED"
}
