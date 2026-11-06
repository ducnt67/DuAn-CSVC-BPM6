from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Mặc định 20 bản ghi/trang; client có thể xin tối đa 200 qua ?page_size= để giảm số lần gọi API."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200
